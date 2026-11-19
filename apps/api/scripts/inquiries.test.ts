import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, mock, test } from "node:test";
import { inquiryRequestSchema, type InquiryRequest } from "@portal-inmobiliario/contracts/inquiries";
import { GET, POST } from "../src/app/api/inquiries/route";
import { createInquiryService, inquiryService } from "../src/services/inquiry-service";
import { authorizationService } from "../src/services/authorization-service";
import { AuthError } from "../src/lib/auth/error";
import { sessionCookieName } from "../src/lib/auth/session";

const property = { id: randomUUID(), title: "Apartamento na Sé" };
const contact = { requestId: randomUUID(), propertyId: property.id, name: "Maria Silva", email: "Maria@exemplo.test", phone: "(11) 91234-5678", message: "Gostaria de agendar uma visita." };
const user = { id: randomUUID(), name: "João de Souza", email: "joao@exemplo.test", role: "USER" as const };
const originalKey = process.env.WEB3FORMS_ACCESS_KEY;
afterEach(() => { mock.restoreAll(); if (originalKey === undefined) delete process.env.WEB3FORMS_ACCESS_KEY; else process.env.WEB3FORMS_ACCESS_KEY = originalKey; });
const request = (body: unknown = contact, headers: Record<string, string> = {}) => new Request("http://localhost:3001/api/inquiries", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});

test("contrato de consulta exige tentativa válida e recusa identidade, título e estado de entrega fornecidos pelo cliente", () => {
  for (const patch of [{ requestId: "inválido" }, { userId: user.id }, { propertyTitle: "falso" }, { emailSent: true }, { botcheck: "robô" }]) {
    assert.equal(inquiryRequestSchema.safeParse({ ...contact, ...patch }).success, false);
  }
  assert.equal(inquiryRequestSchema.parse({ ...contact, requestId: contact.requestId.toUpperCase() }).requestId, contact.requestId);
});

test("serviço salva contato normalizado e prepara e-mail canônico somente após a persistência", async () => {
  process.env.WEB3FORMS_ACCESS_KEY = randomUUID();
  let saved = false;
  const service = createInquiryService({ async save(value, userId) {
    assert.equal(userId, user.id); assert.equal(value.phone, "+5511912345678"); assert.equal(value.email, "maria@exemplo.test");
    saved = true; return { id: value.requestId, createdAt: new Date("2026-11-19T12:00:00Z"), property };
  }, async list() { throw new Error("não utilizado"); } });
  const response = await service.create(contact, user.id);
  assert.ok(saved); assert.equal(response.inquiry.id, contact.requestId);
  assert.equal(response.inquiry.createdAt, "2026-11-19T12:00:00.000Z");
  assert.equal(response.payload.property_title, property.title);
  assert.equal("success" in response, false); assert.equal("userId" in response, false);
});

test("configuração ausente e falha ao salvar não produzem confirmação nem envio externo", async () => {
  const save = mock.fn(async () => { throw new Error("persistência privada"); });
  const external = mock.method(globalThis, "fetch", async () => { throw new Error("envio indevido"); });
  const service = createInquiryService({ save, async list() { throw new Error("não utilizado"); } });
  delete process.env.WEB3FORMS_ACCESS_KEY;
  await assert.rejects(service.create(contact, null), { status: 503 }); assert.equal(save.mock.callCount(), 0);
  process.env.WEB3FORMS_ACCESS_KEY = randomUUID();
  await assert.rejects(service.create(contact, null), /persistência privada/);
  assert.equal(external.mock.callCount(), 0);
});

test("REST aceita visitante e deriva conta exclusivamente da sessão, com respostas privadas", async () => {
  const calls: (string | null)[] = [];
  mock.method(inquiryService, "create", async (_input: InquiryRequest, id: string | null) => { calls.push(id); return { inquiry: { id: contact.requestId } } as never; });
  const auth = mock.method(authorizationService, "requireUser", async () => user);
  for (const headers of [{}, { Cookie: `${sessionCookieName()}=${"a".repeat(64)}` }] as Record<string, string>[]) {
    const response = await POST(request(contact, { "x-user-id": randomUUID(), ...headers }));
    assert.equal(response.status, 201); assert.equal(response.headers.get("cache-control"), "no-store"); assert.match(response.headers.get("vary")!, /Cookie/);
  }
  assert.deepEqual(calls, [null, user.id]); assert.equal(auth.mock.callCount(), 1);
  auth.mock.mockImplementation(async () => { throw new AuthError(401, "Sessão inválida."); });
  const response = await POST(request(contact, { Cookie: `${sessionCookieName()}=${"b".repeat(64)}` }));
  assert.equal(response.status, 401); assert.match(response.headers.get("set-cookie")!, /Max-Age=0/); assert.equal(calls.length, 2);
  assert.equal((await POST(request(contact, { Cookie: `${sessionCookieName()}=inválido` }))).status, 401);
  assert.equal(calls.length, 2);
});

test("REST recusa origem, dados arbitrários, JSON grande e formatos antes de salvar", async () => {
  const create = mock.method(inquiryService, "create", async () => { throw new Error("não executar"); });
  for (const [body, headers, expected] of [
    [contact, { Origin: "https://externo.example" }, 403], [contact, { "Sec-Fetch-Site": "cross-site" }, 403],
    [{ ...contact, userId: user.id }, {}, 400], [{ ...contact, message: "á".repeat(11_000) }, {}, 413],
    [contact, { "Content-Type": "text/plain" }, 415],
  ] as const) assert.equal((await POST(request(body, headers))).status, expected);
  assert.equal(create.mock.callCount(), 0);
});

test("REST oculta erros internos e sinaliza o limite persistente", async () => {
  const create = mock.method(inquiryService, "create", async () => { throw new Error("senha privada"); });
  let response = await POST(request()); assert.equal(response.status, 500); assert.doesNotMatch(await response.text(), /senha privada/);
  create.mock.mockImplementation(async () => { throw new AuthError(429, "Muitas solicitações."); });
  response = await POST(request()); assert.equal(response.status, 429); assert.equal(response.headers.get("retry-after"), "900");
});

test("GET exige sessão, restringe a conta e valida paginação sem aceitar filtros de identidade", async () => {
  const auth = mock.method(authorizationService, "requireUser", async () => { throw new AuthError(401, "Entre na conta."); });
  const list = mock.method(inquiryService, "list", async (id: string, page?: number) => { assert.equal(id, user.id); assert.equal(page, 2); return { items: [] } as never; });
  assert.equal((await GET(new Request("http://localhost/api/inquiries"))).status, 401);
  auth.mock.mockImplementation(async () => user);
  for (const query of ["page=0", "page=2&page=3", "userId=outro", "page=abc"]) {
    assert.equal((await GET(new Request(`http://localhost/api/inquiries?${query}`))).status, 400);
  }
  assert.equal(list.mock.callCount(), 0);
  assert.equal((await GET(new Request("http://localhost/api/inquiries?page=2"))).status, 200);
});

test("listagem serializa datas e não revela o título atual de imóveis despublicados", async () => {
  const service = createInquiryService({ async save() { throw new Error("não utilizado"); }, async list(id) {
    assert.equal(id, user.id);
    return { items: [true, false].map((isPublished) => ({ id: randomUUID(), message: contact.message, createdAt: new Date(0), property: { ...property, isPublished } })), total: 2, page: 1, pageSize: 10, totalPages: 1 };
  } });
  const result = await service.list(user.id);
  assert.deepEqual(result.items[0].property, property); assert.equal(result.items[1].property, null);
  assert.equal(result.items[0].createdAt, new Date(0).toISOString());
});
