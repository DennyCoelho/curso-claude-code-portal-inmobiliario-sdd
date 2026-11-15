import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";
import { submitPropertyContact } from "../src/lib/api/contact";
import { formatContactMobile } from "../src/lib/contact-phone";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, self: dom.window,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import("react-dom/client");
const { PropertyContactForm } = await import("../src/components/properties/property-contact-form");
const propertyId = "a2050000-0000-4000-8000-000000000001";
const contact = { propertyId, name: "Maria Silva", email: "maria@example.com", phone: "(11) 91234-5678", message: "Gostaria de agendar uma visita.", botcheck: "" };
const prepared = { provider: "web3forms", payload: {
  access_key: "00000000-0000-4000-8000-000000000010", name: contact.name, email: contact.email, phone: "+5511912345678", message: contact.message,
  property_id: propertyId, property_title: "Casa em São Paulo", subject: "Contato sobre imóvel: Casa em São Paulo", from_name: "Portal Imobiliário", botcheck: false,
} };
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  mock.restoreAll();
});
after(() => dom.window.close());

async function render(id = propertyId) {
  await act(() => root.render(<PropertyContactForm key={id} propertyId={id} propertyTitle="Casa em São Paulo" />));
}

function field(name: string) {
  const element = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  assert.ok(element, name);
  return element;
}

async function fill(values: Record<string, string>) {
  await act(async () => {
    for (const [name, value] of Object.entries(values)) {
      const element = field(name);
      const prototype = name === "message" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
      element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
  });
}

async function fillValid() {
  const { name, email, phone, message } = contact;
  await fill({ name, email, phone, message });
}

async function submit() {
  const form = container.querySelector("form");
  assert.ok(form);
  await act(async () => { form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
}

test("máscara limita onze dígitos e preserva a posição lógica do cursor, inclusive com +55", () => {
  for (const [raw, value] of [
    ["", ""], ["1", "(1"], ["11", "(11"], ["119", "(11) 9"], ["1191234", "(11) 91234"],
    ["11912345", "(11) 91234-5"], ["11912345678", "(11) 91234-5678"],
    ["(11) 91234-5678999", "(11) 91234-5678"], ["abc11912345678", "(11) 91234-5678"],
    ["+55 (11) 91234-5678", "(11) 91234-5678"], ["(55) 99999-1234", "(55) 99999-1234"],
    ["+55 (55) 99999-1234", "(55) 99999-1234"],
  ]) assert.equal(formatContactMobile(raw).value, value, raw);
  assert.deepEqual(formatContactMobile("(21) 91234-5678", 2), { value: "(21) 91234-5678", caret: 2 });
  assert.deepEqual(formatContactMobile("(11) 912345678", 10), { value: "(11) 91234-5678", caret: 10 });
  assert.equal(formatContactMobile("(11) 91234-5678", 0).caret, 0);
});

test("os quatro campos obrigatórios exibem os placeholders solicitados e asteriscos nos rótulos", async () => {
  await render();
  for (const [name, placeholder] of [["name", "João de Souza"], ["email", "seuemail@exemplo.com"], ["phone", "(99) 99999-9999"], ["message", "Escreva sua mensagem aqui"]]) {
    const input = field(name);
    assert.equal(input.placeholder, placeholder);
    assert.equal(input.required, true);
    assert.match(container.querySelector(`label[for="${input.id}"]`)?.textContent ?? "", /\*/);
  }
});

test("digitação e colagem formatam o celular, limitam o tamanho e impedem enviar um número incompleto", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({ success: true }));
  await render();
  await fillValid();
  await fill({ phone: "" });
  for (const digit of "11912345678") await fill({ phone: field("phone").value + digit });
  assert.equal(field("phone").value, "(11) 91234-5678");
  await fill({ phone: field("phone").value + "999" });
  assert.equal(field("phone").value, "(11) 91234-5678");
  await fill({ phone: "+55 (55) 99999-1234" });
  assert.equal(field("phone").value, "(55) 99999-1234");
  await fill({ phone: "(11) 91234-567" });
  await submit();
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal(field("phone").value, "(11) 91234-567");
  assert.equal(field("phone").getAttribute("aria-invalid"), "true");
  assert.match(container.querySelector("#contact-phone-error")?.textContent ?? "", /celular.*11 dígitos/);
});

test("cliente prepara por REST e envia diretamente ao Web3Forms com os dados canônicos", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => Response.json(input === "/api/contact" ? prepared : { success: true }));
  assert.deepEqual(await submitPropertyContact(contact), { success: true, message: "Solicitação enviada com sucesso." });
  const [url, options] = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.equal(url, "/api/contact");
  assert.equal(options.method, "POST");
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(options.body as string), contact);
  assert.equal(fetchMock.mock.callCount(), 2);
  const [providerUrl, providerOptions] = fetchMock.mock.calls[1].arguments as unknown as [string, RequestInit];
  assert.equal(providerUrl, "https://api.web3forms.com/submit");
  assert.equal(providerOptions.method, "POST");
  assert.ok(providerOptions.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(providerOptions.body as string), prepared.payload);
});

test("preparação inválida ou indisponível impede chamar o Web3Forms e não expõe mensagens privadas", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({ success: false, message: "segredo privado" }));
  for (const [body, status] of [[{ success: false }, 200], [{ success: "true" }, 200], [null, 200], [{ message: "segredo privado" }, 400], [{ success: true }, 500]] as const) {
    fetchMock.mock.mockImplementation(async () => Response.json(body, { status }));
    await assert.rejects(submitPropertyContact(contact), { message: status === 200 ? "Não foi possível preparar a solicitação. Tente novamente mais tarde." : "Não foi possível confirmar o envio. Aguarde antes de tentar novamente." });
  }
  for (const [status, message] of [[503, "O contato está temporariamente indisponível. Tente novamente mais tarde."], [404, "Este imóvel não está disponível para contato."]] as const) {
    fetchMock.mock.mockImplementation(async () => Response.json({ message: "segredo privado" }, { status }));
    await assert.rejects(submitPropertyContact(contact), { message });
  }
  fetchMock.mock.mockImplementation(async () => new Response("JSON inválido"));
  await assert.rejects(submitPropertyContact(contact), /Não foi possível confirmar/);
  fetchMock.mock.mockImplementation(async () => { throw new Error("rede privada"); });
  await assert.rejects(submitPropertyContact(contact), /Não foi possível confirmar/);
  assert.equal(fetchMock.mock.callCount(), 9);
  for (const call of fetchMock.mock.calls) assert.equal(call.arguments[0], "/api/contact");
});

test("preparação de outro imóvel ou com campos privados é rejeitada antes do envio", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json(prepared));
  for (const response of [
    { ...prepared, payload: { ...prepared.payload, property_id: "a2050000-0000-4000-8000-000000000002" } },
    { ...prepared, payload: { ...prepared.payload, recipient: "outro@example.com" } },
    { ...prepared, payload: { ...prepared.payload, access_key: "inválida" } },
  ]) {
    fetchMock.mock.mockImplementation(async () => Response.json(response));
    await assert.rejects(submitPropertyContact(contact), /Não foi possível preparar/);
  }
  assert.equal(fetchMock.mock.callCount(), 3);
});

test("somente confirmação explícita do provedor conclui o envio, sem repetição automática", async () => {
  let provider: () => Promise<Response> = async () => Response.json({ success: false });
  const fetchMock = mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0]) => input === "/api/contact" ? Response.json(prepared) : provider());
  for (const [body, status] of [[{ success: false }, 200], [{ success: "true" }, 200], [null, 200], [{ success: true }, 403], [{ success: true }, 429], [{ success: true }, 500]] as const) {
    provider = async () => Response.json(body, { status });
    await assert.rejects(submitPropertyContact(contact), /Não foi possível confirmar/);
  }
  provider = async () => new Response("<html>Just a moment...</html>", { status: 403 });
  await assert.rejects(submitPropertyContact(contact), /Não foi possível confirmar/);
  provider = async () => { throw new Error("dados privados da rede"); };
  await assert.rejects(submitPropertyContact(contact), /Não foi possível confirmar/);
  assert.equal(fetchMock.mock.callCount(), 16);
});

test("formulário associa rótulos e erros aos campos e impede submissão inválida", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({ success: true }));
  await render();
  assert.match(container.textContent ?? "", /Casa em São Paulo/);
  for (const name of ["name", "email", "phone", "message"]) {
    assert.ok(container.querySelector(`label[for="${field(name).id}"]`));
  }
  await fill({ name: "M", email: "invalido", phone: "123", message: "curta" });
  await submit();
  assert.equal(fetchMock.mock.callCount(), 0);
  for (const name of ["name", "email", "phone", "message"]) {
    assert.equal(field(name).getAttribute("aria-invalid"), "true");
    const errorId = field(name).getAttribute("aria-describedby");
    assert.ok(container.querySelector(`#${errorId}`));
  }
  assert.equal(document.activeElement?.id, field("name").id);
});

test("envio pendente desabilita campos, evita duplicação e limpa dados somente após sucesso", async () => {
  let finish: ((value: Response) => void) | undefined;
  const fetchMock = mock.method(globalThis, "fetch", (input: Parameters<typeof fetch>[0]) => input === "/api/contact" ? Promise.resolve(Response.json(prepared)) : new Promise<Response>((resolve) => { finish = resolve; }));
  await render();
  await fillValid();
  await submit();
  assert.equal(container.querySelector("form")?.getAttribute("aria-busy"), "true");
  assert.equal(container.querySelector("fieldset")?.disabled, true);
  assert.match(container.querySelector('[role="status"]')?.textContent ?? "", /Enviando/);
  await submit();
  assert.equal(fetchMock.mock.callCount(), 2);
  const [, options] = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.deepEqual(JSON.parse(options.body as string), contact);
  await act(async () => { finish!(Response.json({ success: true })); });
  assert.match(container.querySelector('[role="status"]')?.textContent ?? "", /Solicitação enviada com sucesso/);
  assert.equal(field("name").value, "");
  assert.equal(field("message").value, "");
  assert.equal(container.querySelector("fieldset")?.disabled, false);
});

test("falha preserva os dados para nova tentativa e troca de imóvel reinicia o formulário", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({ message: "privado" }, { status: 503 }));
  await render();
  await fillValid();
  await submit();
  assert.match(container.querySelector('[role="alert"]')?.textContent ?? "", /temporariamente indisponível.*Seus dados foram mantidos/);
  assert.equal(field("message").value, contact.message);
  assert.equal(field("email").value, contact.email);
  assert.equal(container.querySelector("fieldset")?.disabled, false);
  fetchMock.mock.mockImplementation(async (input: Parameters<typeof fetch>[0]) => Response.json(input === "/api/contact" ? prepared : { success: true }));
  await submit();
  assert.equal(fetchMock.mock.callCount(), 3);
  assert.match(container.querySelector('[role="status"]')?.textContent ?? "", /sucesso/);
  await fillValid();
  await render("a2050000-0000-4000-8000-000000000002");
  assert.equal(field("name").value, "");
  assert.equal(container.querySelector('[role="status"]')?.textContent, "");
});
