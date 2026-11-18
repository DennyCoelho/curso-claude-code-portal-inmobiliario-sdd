import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/account" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, self: dom.window,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { ProfileNameForm, EmailChangeForm, PasswordChangeForm } = await import("../src/components/account/account-forms");
const { EmailConfirmationForm, EmailConfirmationPanel } = await import("../src/components/account/confirm-email");
const { updateProfile, changeAccountPassword, requestEmailChange, confirmEmailChange } = await import("../src/lib/api/account");
const user = { id: "a2050000-0000-4000-8000-000000000001", name: "João de Souza", email: "joao@example.com", role: "USER" as const };
const blank = { currentPassword: "", newPassword: "", confirmPassword: "" };
const change = { currentPassword: "Atual123!", newPassword: "Nova123!", confirmPassword: "Nova123!" };
const token = "a".repeat(64);
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => { container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(() => root.unmount()); container.remove(); mock.restoreAll(); window.history.replaceState(null, "", "/account"); });
after(() => dom.window.close());
function field(name: string) { const element = container.querySelector<HTMLInputElement>(`[name="${name}"]`); assert.ok(element, name); return element; }
async function fill(data: Record<string, string>) {
  await act(async () => { for (const [name, value] of Object.entries(data)) {
    const element = field(name); Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new dom.window.Event("input", { bubbles: true })); element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  } });
}
async function submit() { await act(async () => { container.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); }); }

test("nome valida e foca o campo, salva sem senha/e-mail e só apresenta sucesso após a resposta", async () => {
  let finish!: (response: Response) => void;
  const calls = mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { finish = resolve; }));
  const updated: unknown[] = [];
  await act(() => root.render(<ProfileNameForm name={user.name} onUpdated={(value) => { updated.push(value); }} />));
  await fill({ name: "" }); await submit(); assert.equal(calls.mock.callCount(), 0); assert.equal(document.activeElement, field("name"));
  await fill({ name: " Maria de Souza " }); await submit(); await submit();
  assert.equal(calls.mock.callCount(), 1); assert.equal(container.querySelector("fieldset")!.disabled, true);
  assert.deepEqual(JSON.parse((calls.mock.calls[0].arguments[1] as RequestInit).body as string), { name: "Maria de Souza" });
  assert.match(container.textContent!, /Salvando alterações/); assert.doesNotMatch(container.textContent!, /atualizado com sucesso/);
  await act(async () => { finish(Response.json({ user: { ...user, name: "Maria de Souza" } })); });
  assert.equal(field("name").value, "Maria de Souza"); assert.equal(updated.length, 1); assert.match(container.textContent!, /Nome atualizado com sucesso/);
});

test("troca totalmente vazia é permitida, com indicação de senha mantida e sem exigir senha atual", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ user, changed: false }));
  await act(() => root.render(<PasswordChangeForm onUpdated={() => {}} />)); await submit();
  assert.deepEqual(JSON.parse((calls.mock.calls[0].arguments[1] as RequestInit).body as string), blank);
  assert.match(container.textContent!, /Sua senha atual foi mantida/); assert.equal(container.querySelectorAll('[role="alert"]').length, 0);
});

test("preenchimento parcial e confirmação divergente impedem envio e focam o primeiro erro", async () => {
  const calls = mock.method(globalThis, "fetch");
  await act(() => root.render(<PasswordChangeForm onUpdated={() => {}} />));
  await fill({ newPassword: "Nova123!" }); await submit();
  assert.equal(calls.mock.callCount(), 0); assert.equal(document.activeElement, field("currentPassword"));
  await fill({ currentPassword: change.currentPassword, confirmPassword: "Outra123!" }); await submit();
  assert.equal(calls.mock.callCount(), 0); assert.equal(document.activeElement, field("confirmPassword"));
  assert.match(container.textContent!, /As senhas ainda não são iguais/);
  await fill({ newPassword: "fraca", confirmPassword: "fraca" }); await submit();
  assert.equal(document.activeElement, field("newPassword")); assert.equal(calls.mock.callCount(), 0);
});

test("troca válida acompanha critérios, mantém visibilidade independente, bloqueia repetição e limpa/oculta no sucesso", async () => {
  let finish!: (response: Response) => void;
  const calls = mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { finish = resolve; }));
  let updated = 0;
  await act(() => root.render(<PasswordChangeForm onUpdated={() => { updated++; }} />)); await fill(change);
  assert.match(container.textContent!, /4 de 4 critérios atendidos/); assert.match(container.textContent!, /As senhas são iguais/);
  await act(() => container.querySelector<HTMLButtonElement>('button[aria-controls="account-newPassword"]')!.click());
  assert.equal(field("newPassword").type, "text"); assert.equal(field("currentPassword").type, "password");
  await submit(); await submit(); assert.equal(calls.mock.callCount(), 1); assert.match(container.textContent!, /Alterando senha/);
  assert.equal(container.querySelector("fieldset")!.disabled, true);
  await act(async () => { finish(Response.json({ user, changed: true })); });
  for (const name of Object.keys(change)) { assert.equal(field(name).value, ""); assert.equal(field(name).type, "password"); }
  assert.equal(updated, 1); assert.match(container.textContent!, /sessões dos outros dispositivos foram encerradas/);
});

test("senha atual incorreta e falha de rede preservam campos e liberam nova tentativa sem sucesso falso", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ message: "A senha atual está incorreta." }, { status: 400 }));
  await act(() => root.render(<PasswordChangeForm onUpdated={() => { throw new Error("Não deve atualizar"); }} />)); await fill(change); await submit();
  assert.match(container.textContent!, /senha atual está incorreta/); assert.equal(field("newPassword").value, change.newPassword);
  assert.equal(container.querySelector("fieldset")!.disabled, false); assert.doesNotMatch(container.textContent!, /Senha alterada com sucesso/);
  calls.mock.mockImplementation(async () => { throw new Error("credencial-privada"); }); await submit();
  assert.match(container.textContent!, /Verifique sua conexão/); assert.doesNotMatch(container.textContent!, /credencial-privada|Senha alterada com sucesso/);
});

test("e-mail é normalizado, exige senha atual e informa confirmação somente após envio aceito", async () => {
  let finish!: (response: Response) => void;
  const calls = mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { finish = resolve; }));
  await act(() => root.render(<EmailChangeForm email={user.email} />)); await fill({ email: " NOVO@EXAMPLE.COM " }); await submit();
  assert.equal(calls.mock.callCount(), 0); assert.equal(document.activeElement, field("currentPassword"));
  await fill({ currentPassword: change.currentPassword }); await submit(); await submit();
  assert.equal(calls.mock.callCount(), 1); assert.match(container.textContent!, /Enviando confirmação/);
  assert.deepEqual(JSON.parse((calls.mock.calls[0].arguments[1] as RequestInit).body as string), { email: "novo@example.com", currentPassword: change.currentPassword });
  await act(async () => { finish(Response.json({ message: "Enviamos um link para o novo e-mail. Seu endereço atual permanece válido." }, { status: 202 })); });
  assert.match(container.textContent!, /Seu endereço atual permanece válido/); assert.equal(field("currentPassword").value, "");
});

test("indisponibilidade do envio não confirma solicitação nem descarta o formulário de e-mail", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ message: "privado" }, { status: 503 }));
  await act(() => root.render(<EmailChangeForm email={user.email} />)); await fill({ email: "novo@example.com", currentPassword: change.currentPassword }); await submit();
  assert.match(container.textContent!, /temporariamente indisponível/); assert.doesNotMatch(container.textContent!, /Enviamos um link|privado/);
  assert.equal(field("email").value, "novo@example.com"); assert.equal(field("currentPassword").value, change.currentPassword);
});

test("link de e-mail não confirma ao abrir, exige ação explícita, impede duplicação e remove o token após sucesso", async () => {
  let finish!: (response: Response) => void;
  const calls = mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { finish = resolve; }));
  window.history.replaceState(null, "", `/confirm-email#token=${token}`);
  await act(() => root.render(<EmailConfirmationPanel />)); assert.equal(calls.mock.callCount(), 0);
  const button = container.querySelector<HTMLButtonElement>("button")!;
  await act(() => { button.click(); button.click(); }); assert.equal(calls.mock.callCount(), 1); assert.equal(button.disabled, true);
  assert.deepEqual(JSON.parse((calls.mock.calls[0].arguments[1] as RequestInit).body as string), { token });
  await act(async () => { finish(Response.json({ user: { ...user, email: "novo@example.com" } })); });
  assert.match(container.textContent!, /E-mail atualizado com sucesso/); assert.equal(window.location.hash, ""); assert.equal(container.querySelector("button"), null);
});

test("links ausentes/repetidos/expirados e sessão ausente não exibem confirmação de sucesso", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ message: "privado" }, { status: 401 }));
  for (const fragment of ["", "#token=invalido", `#token=${token}&token=${token}`]) {
    await act(() => root.render(<div />)); window.history.replaceState(null, "", `/confirm-email${fragment}`);
    await act(() => root.render(<EmailConfirmationPanel />)); assert.equal(container.querySelector("button"), null);
  }
  assert.equal(calls.mock.callCount(), 0);
  await act(() => root.render(<EmailConfirmationForm token={token} />)); await act(() => container.querySelector<HTMLButtonElement>("button")!.click());
  assert.match(container.textContent!, /Entre na conta que solicitou/); assert.doesNotMatch(container.textContent!, /atualizado com sucesso|privado/);
  calls.mock.mockImplementation(async () => Response.json({}, { status: 400 })); await act(() => container.querySelector<HTMLButtonElement>("button")!.click());
  assert.match(container.textContent!, /expirou ou já foi utilizado/);
});

test("cliente da conta usa cookies, métodos REST e timeout e recusa contratos que exponham dados internos", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ user })); await updateProfile({ name: user.name });
  assert.equal(calls.mock.calls[0].arguments[0], "/api/account/profile");
  const options = calls.mock.calls[0].arguments[1] as RequestInit;
  assert.equal(options.method, "PATCH"); assert.equal(options.credentials, "same-origin"); assert.equal(options.cache, "no-store"); assert.ok(options.signal instanceof AbortSignal);
  calls.mock.mockImplementation(async () => Response.json({ user: { ...user, passwordHash: "privado" }, changed: true }));
  await assert.rejects(changeAccountPassword(change), /Não foi possível confirmar/);
  for (const [status, message] of [[429, /quinze minutos/], [409, /Confira os dados/], [500, /Não foi possível concluir/]] as const) {
    calls.mock.mockImplementation(async () => Response.json({ message: "detalhe-privado" }, { status }));
    await assert.rejects(requestEmailChange({ email: "novo@example.com", currentPassword: change.currentPassword }), message);
  }
  calls.mock.mockImplementation(async () => Response.json({ user })); assert.deepEqual(await confirmEmailChange({ token }), { user });
});
