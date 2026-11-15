import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { normalizeBrazilianPhone, propertyContactSchema, preparedPropertyContactSchema, type PreparedPropertyContact } from "@portal-inmobiliario/contracts/property-contact";
import { POST } from "../src/app/api/contact/route";
import { createPropertyContactService, propertyContactService } from "../src/services/property-contact-service";

const propertyId = "a2050000-0000-4000-8000-000000000001";
const accessKey = "00000000-0000-4000-8000-000000000010";
const contact = { propertyId, name: "Maria Silva", email: "maria@example.com", phone: "(11) 91234-5678", message: "Gostaria de agendar uma visita." };
const prepared: PreparedPropertyContact = { provider: "web3forms", payload: {
  access_key: accessKey, name: contact.name, email: contact.email, phone: "+5511912345678", message: contact.message,
  property_id: propertyId, property_title: "Apartamento na Sé", subject: "Contato sobre imóvel: Apartamento na Sé", from_name: "Portal Imobiliário", botcheck: false,
} };
const originalKey = process.env.WEB3FORMS_ACCESS_KEY;

afterEach(() => {
  mock.restoreAll();
  if (originalKey === undefined) delete process.env.WEB3FORMS_ACCESS_KEY;
  else process.env.WEB3FORMS_ACCESS_KEY = originalKey;
});

function request(body: unknown = contact, headers = { "Content-Type": "application/json" }) {
  return POST(new Request("http://localhost/api/contact", { method: "POST", headers, body: JSON.stringify(body) }));
}

test("telefones fixos e celulares brasileiros são normalizados, inclusive o DDD 55", () => {
  for (const [value, expected] of [
    ["(11) 91234-5678", "+5511912345678"], ["+55 (11) 91234-5678", "+5511912345678"],
    ["5511912345678", "+5511912345678"], ["(21) 2345-6789", "+552123456789"],
    ["(55) 99999-1234", "+5555999991234"], ["+55 (55) 3333-1234", "+555533331234"],
  ]) assert.equal(normalizeBrazilianPhone(value), expected, value);
  for (const value of ["", "91234-5678", "+1 11912345678", "(20) 91234-5678", "(11) 81234-5678", "(11) 1234-5678", "(11) 91234-56789", "11abc912345678", "++55 11912345678", "0800 123 4567"]) {
    assert.equal(normalizeBrazilianPhone(value), null, value);
  }
});

test("contrato valida limites, normaliza textos e rejeita campos arbitrários e antispam preenchido", () => {
  assert.deepEqual(propertyContactSchema.parse({ ...contact, propertyId: propertyId.toUpperCase(), name: "  Maria Silva  ", email: " maria@example.com ", message: `  ${contact.message}  ` }), contact);
  for (const patch of [
    { propertyId: "inválido" }, { name: " " }, { name: "a".repeat(101) }, { name: "Maria\nBcc: outro" },
    { email: "email inválido" }, { email: "a".repeat(255) }, { phone: "123" },
    { phone: "(11) 2345-6789" }, { phone: "(11) 91234-567" }, { phone: "(11) 91234-56789" },
    { message: "curta" }, { message: " ".repeat(10) }, { message: "a".repeat(3001) },
    { propertyTitle: "Título adulterado" }, { access_key: "adulterada" }, { botcheck: "robô" },
  ]) assert.equal(propertyContactSchema.safeParse({ ...contact, ...patch }).success, false, JSON.stringify(patch).slice(0, 100));
  assert.equal(propertyContactSchema.safeParse({ ...contact, name: "a".repeat(100), message: "a".repeat(3000) }).success, true);
});

test("serviço prepara o título canônico, normaliza telefone e não envia pelo servidor", async () => {
  process.env.WEB3FORMS_ACCESS_KEY = accessKey;
  const external = mock.method(globalThis, "fetch", async () => { throw new Error("O backend não deve chamar o Web3Forms."); });
  const service = createPropertyContactService({ async findById(id) {
    assert.equal(id, propertyId);
    return { id, title: "Apartamento na Sé" };
  } });
  const response = await service.prepare(contact);
  assert.deepEqual(response, prepared);
  assert.equal("success" in response, false, "Preparar não confirma envio.");
  assert.equal(external.mock.callCount(), 0);
});

test("chave ausente/inválida e imóvel indisponível impedem a preparação", async () => {
  let lookedUp = false;
  const service = createPropertyContactService({ async findById() { lookedUp = true; return null; } });
  for (const key of [undefined, "", "chave-fictícia"]) {
    if (key === undefined) delete process.env.WEB3FORMS_ACCESS_KEY;
    else process.env.WEB3FORMS_ACCESS_KEY = key;
    await assert.rejects(service.prepare(contact), { status: 503 });
    assert.equal(lookedUp, false);
  }
  process.env.WEB3FORMS_ACCESS_KEY = accessKey;
  await assert.rejects(service.prepare(contact), { status: 404 });
  assert.equal(lookedUp, true);
});

test("resposta pública preparada valida chave, telefone normalizado e campos permitidos", () => {
  assert.deepEqual(preparedPropertyContactSchema.parse(prepared), prepared);
  for (const payload of [
    { ...prepared.payload, access_key: "inválida" }, { ...prepared.payload, phone: contact.phone },
    { ...prepared.payload, botcheck: true }, { ...prepared.payload, database_url: "privada" },
    { ...prepared.payload, recipient: "outro@example.com" },
  ]) assert.equal(preparedPropertyContactSchema.safeParse({ ...prepared, payload }).success, false);
  assert.equal(preparedPropertyContactSchema.safeParse({ ...prepared, success: true }).success, false);
});

test("REST rejeita conteúdo inválido, campos adulterados e corpos grandes antes do serviço", async () => {
  const prepare = mock.method(propertyContactService, "prepare", async () => prepared);
  for (const body of [null, [], {}, { ...contact, phone: "123" }, { ...contact, phone: "(11) 2345-6789" }, { ...contact, phone: "(11) 91234-56789" }, { ...contact, propertyId: "inválido" }, { ...contact, propertyTitle: "Falso" }, { ...contact, botcheck: "spam" }]) {
    const response = await request(body);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal((await request(contact, { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await request({ ...contact, message: "a".repeat(20_001) })).status, 413);
  assert.equal((await POST(new Request("http://localhost/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status, 400);
  assert.equal(prepare.mock.callCount(), 0);
});

test("REST devolve preparação sem cache e oculta erros internos", async () => {
  const prepare = mock.method(propertyContactService, "prepare", async () => prepared);
  let response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), prepared);
  prepare.mock.mockImplementation(async () => { throw new Error("senha do banco privada"); });
  response = await request();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { message: "Não foi possível preparar a solicitação. Tente novamente mais tarde.", status: 500 });
});

test("REST informa indisponibilidade de configuração sem fingir sucesso", async () => {
  delete process.env.WEB3FORMS_ACCESS_KEY;
  const response = await request();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { message: "O contato está temporariamente indisponível. Tente novamente mais tarde.", status: 503 });
});
