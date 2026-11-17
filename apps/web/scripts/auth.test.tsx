import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";
import { requestAuth } from "../src/lib/api/auth";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, self: dom.window,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import("react-dom/client");
const { SWRConfig } = await import("swr");
const { AuthForm } = await import("../src/components/auth/auth-form");
const { AuthPanel } = await import("../src/components/auth/auth-panel");
const { ForgotPasswordForm } = await import("../src/components/auth/forgot-password-form");
const { ResetPasswordForm, ResetPasswordPanel } = await import("../src/components/auth/reset-password-form");
const { requestPasswordRecovery } = await import("../src/lib/api/password-recovery");
const { SiteHeader } = await import("../src/components/layout/site-header");
const user = { id: "a2050000-0000-4000-8000-000000000001", name: "João de Souza", email: "joao@example.com", role: "USER" };
const values = { name: user.name, email: user.email, password: "Teste123!", confirmPassword: "Teste123!" };
const resetToken = "a".repeat(64);

test("recuperação valida e-mail, normaliza o envio e apresenta resposta condicional somente após a API", async () => {
  let finish!: (response: Response) => void;
  const calls = mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { finish = resolve; }));
  await act(() => root.render(<ForgotPasswordForm />));
  await submit();
  assert.equal(calls.mock.callCount(), 0); assert.equal(document.activeElement, field("email"));
  await fill({ email: " JOAO@EXAMPLE.COM " }); await submit(); await submit();
  assert.equal(calls.mock.callCount(), 1);
  assert.equal(container.querySelector("fieldset")!.disabled, true);
  assert.match(container.textContent!, /Solicitando link/);
  assert.deepEqual(JSON.parse((calls.mock.calls[0].arguments[1] as RequestInit).body as string), { email: values.email });
  await act(async () => { finish(Response.json({ message: "aceito" }, { status: 202 })); });
  assert.match(container.textContent!, /Se houver uma conta ativa/);
  assert.match(container.textContent!, /30 minutos/);
  assert.ok(container.querySelector('a[href="/login"]'));
  await act(() => container.querySelector<HTMLButtonElement>('button[type="button"]')!.click());
  assert.equal(field("email").value, "JOAO@EXAMPLE.COM");
});

test("solicitação com envio indisponível preserva e-mail e permite corrigir/tentar novamente", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ message: "segredo" }, { status: 503 }));
  await act(() => root.render(<ForgotPasswordForm />));
  await fill({ email: values.email }); await submit();
  assert.equal(field("email").value, values.email);
  assert.match(container.textContent!, /temporariamente indisponível/);
  assert.doesNotMatch(container.textContent!, /Se houver|segredo/);
  assert.equal(container.querySelector("fieldset")!.disabled, false);
});

test("nova senha exige política e confirmação, permite mostrar campos e bloqueia envio repetido", async () => {
  let finish!: (response: Response) => void;
  const calls = mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { finish = resolve; }));
  await act(() => root.render(<ResetPasswordForm token={resetToken} />));
  await fill({ password: "fraca", confirmPassword: "diferente" }); await submit();
  assert.equal(calls.mock.callCount(), 0);
  assert.equal(document.activeElement, field("password"));
  await fill({ password: "Nova123!", confirmPassword: "Nova123!" });
  assert.match(container.textContent!, /4 de 4 critérios atendidos/);
  assert.match(container.textContent!, /As senhas são iguais/);
  const toggle = container.querySelector<HTMLButtonElement>('button[aria-controls="reset-password"]')!;
  await act(() => toggle.click());
  assert.equal(field("password").type, "text"); assert.equal(field("confirmPassword").type, "password");
  await submit(); await submit();
  assert.equal(calls.mock.callCount(), 1); assert.equal(container.querySelector("fieldset")!.disabled, true);
  assert.match(container.textContent!, /Redefinindo senha/);
  assert.deepEqual(JSON.parse((calls.mock.calls[0].arguments[1] as RequestInit).body as string), { token: resetToken, password: "Nova123!", confirmPassword: "Nova123!" });
  await act(async () => { finish(Response.json({ message: "sucesso" })); });
  assert.match(container.textContent!, /Senha redefinida com sucesso/);
  assert.match(container.textContent!, /sessões anteriores foram encerradas/);
  assert.equal(container.querySelector('input[type="password"]'), null);
  assert.ok(container.querySelector('a[href="/login"]'));
});

test("link expirado informa nova solicitação e não apresenta sucesso", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ message: "privado" }, { status: 400 }));
  await act(() => root.render(<ResetPasswordForm token={resetToken} />));
  await fill({ password: "Nova123!", confirmPassword: "Nova123!" }); await submit();
  assert.match(container.textContent!, /inválido, expirou ou já foi utilizado/);
  assert.doesNotMatch(container.textContent!, /Senha redefinida com sucesso|privado/);
  assert.equal(field("password").value, "Nova123!");
  assert.ok(container.querySelector('a[href="/forgot-password"]'));
});

test("token ausente/malformado ou repetido impede formulário; fragmento válido é lido no cliente", async () => {
  const calls = mock.method(globalThis, "fetch");
  for (const token of [null, "inválido"]) {
    await act(() => root.render(<ResetPasswordForm key={String(token)} token={token} />));
    assert.equal(container.querySelector("form"), null); assert.match(container.textContent!, /link é inválido/);
  }
  window.history.replaceState(null, "", `/reset-password#token=${resetToken}`);
  await act(() => root.render(<ResetPasswordPanel />));
  assert.ok(container.querySelector("form")); assert.equal(calls.mock.callCount(), 0);
  await act(() => root.render(<div />));
  window.history.replaceState(null, "", `/reset-password#token=${resetToken}&token=${resetToken}`);
  await act(() => root.render(<ResetPasswordPanel />));
  assert.equal(container.querySelector("form"), null);
  window.history.replaceState(null, "", "/");
});

test("cliente da recuperação usa REST sem cache e traduz falhas sem expor respostas internas", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ message: "aceito" }, { status: 202 }));
  await requestPasswordRecovery("forgot-password", { email: values.email });
  const options = calls.mock.calls[0].arguments[1] as RequestInit;
  assert.equal(options.credentials, "same-origin"); assert.equal(options.cache, "no-store");
  for (const [status, message] of [[400, /inválido/], [429, /quinze minutos/], [503, /indisponível/], [500, /Não foi possível concluir/]] as const) {
    calls.mock.mockImplementation(async () => Response.json({ message: "segredo" }, { status }));
    await assert.rejects(requestPasswordRecovery("reset-password", { token: resetToken, password: "Nova123!", confirmPassword: "Nova123!" }), message);
  }
});
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => { container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(() => root.unmount()); container.remove(); mock.restoreAll(); });
after(() => dom.window.close());
function field(name: string) {
  const element = container.querySelector<HTMLInputElement>(`[name="${name}"]`);
  assert.ok(element, name);
  return element;
}
async function fill(data: Record<string, string>) {
  await act(async () => {
    for (const [name, value] of Object.entries(data)) {
      const element = field(name);
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(element, value);
      element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      element.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
  });
}
async function submit() {
  await act(async () => { container.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
}

test("cliente de autenticação usa cookies da mesma origem e valida o usuário sem aceitar dados internos", async () => {
  const calls: RequestInit[] = [];
  mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => { calls.push(options); return Response.json({ user }); });
  assert.deepEqual(await requestAuth("login", { email: values.email, password: values.password }), user);
  assert.equal(calls[0].credentials, "same-origin");
  assert.equal(calls[0].cache, "no-store");
  assert.deepEqual(JSON.parse(calls[0].body as string), { email: values.email, password: values.password });
  mock.method(globalThis, "fetch", async () => Response.json({ user: { ...user, passwordHash: "privado" } }));
  await assert.rejects(requestAuth("login", values), /Não foi possível confirmar/);
});

test("cliente trata sessão ausente/logout, falhas e limite sem exibir mensagens internas nem repetir requisições", async () => {
  for (const [action, response, expected] of [
    ["me", Response.json({ message: "ausente" }, { status: 401 }), null],
    ["logout", new Response(null, { status: 204 }), null],
  ] as const) {
    mock.method(globalThis, "fetch", async () => response);
    assert.equal(await requestAuth(action), expected);
  }
  for (const [status, message] of [[401, /E-mail ou senha/], [409, /já está cadastrado/], [429, /quinze minutos/], [503, /ocupada/], [500, /Não foi possível concluir/]] as const) {
    const calls = mock.method(globalThis, "fetch", async () => Response.json({ message: "Detalhe privado" }, { status }));
    await assert.rejects(requestAuth("login", values), message);
    assert.equal(calls.mock.callCount(), 1);
  }
});

test("cadastro associa rótulos e erros, impede envio inválido e foca o primeiro campo", async () => {
  const calls = mock.method(globalThis, "fetch");
  await act(() => root.render(<AuthForm mode="register" onAuthenticated={async () => {}} />));
  for (const name of ["name", "email", "password", "confirmPassword"]) {
    assert.ok(container.querySelector(`label[for="auth-${name}"]`));
    assert.equal(field(name).required, true);
  }
  assert.equal(field("password").type, "password");
  assert.equal(field("password").autocomplete, "new-password");
  await submit();
  assert.equal(calls.mock.callCount(), 0);
  assert.equal(document.activeElement, field("name"));
  assert.equal(field("name").getAttribute("aria-invalid"), "true");
  assert.ok(container.querySelector("#auth-name-error"));
});

test("login envia somente credenciais normalizadas, bloqueia duplicação e limpa a senha ao confirmar", async () => {
  let resolve!: (response: Response) => void;
  const pending = new Promise<Response>((done) => { resolve = done; });
  const calls = mock.method(globalThis, "fetch", () => pending);
  let authenticated: unknown;
  await act(() => root.render(<AuthForm mode="login" onAuthenticated={async (value) => { authenticated = value; }} />));
  assert.equal(container.querySelector('[name="name"]'), null);
  assert.equal(container.querySelector('[name="confirmPassword"]'), null);
  assert.equal(container.querySelector('[aria-label="Critérios da senha"]'), null);
  assert.equal(field("password").autocomplete, "current-password");
  await fill({ email: " JOAO@EXAMPLE.COM ", password: values.password });
  const toggle = container.querySelector<HTMLButtonElement>('button[aria-controls="auth-password"]')!;
  await act(() => toggle.click());
  await submit();
  assert.equal(container.querySelector("fieldset")!.disabled, true);
  assert.match(container.querySelector('button[type="submit"]')!.textContent!, /Entrando/);
  assert.equal(container.querySelector('button[type="submit"]')!.getAttribute("aria-busy"), "true");
  assert.ok(container.querySelector('button[type="submit"] svg[aria-hidden="true"]'));
  assert.equal(toggle.disabled, true);
  await submit();
  assert.equal(calls.mock.callCount(), 1);
  assert.equal(calls.mock.calls[0].arguments[0], "/api/auth/login");
  const options = calls.mock.calls[0].arguments[1] as RequestInit;
  assert.deepEqual(JSON.parse(options.body as string), { email: values.email, password: values.password });
  await act(async () => { resolve(Response.json({ user })); });
  assert.deepEqual(authenticated, user);
  assert.equal(field("password").value, "");
  assert.equal(field("password").type, "password");
});

test("botão do login mostra e oculta a senha sem alterar o valor nem enviar o formulário", async () => {
  const calls = mock.method(globalThis, "fetch");
  await act(() => root.render(<AuthForm mode="login" onAuthenticated={async () => {}} />));
  await fill({ email: values.email, password: values.password });
  const toggle = container.querySelector<HTMLButtonElement>('button[aria-controls="auth-password"]');
  assert.ok(toggle);
  assert.equal(toggle.type, "button");
  assert.equal(toggle.getAttribute("aria-label"), "Mostrar senha");
  assert.equal(toggle.getAttribute("aria-pressed"), "false");
  assert.equal(field("password").type, "password");
  await act(() => toggle.click());
  assert.equal(field("password").type, "text");
  assert.equal(field("password").value, values.password);
  assert.equal(toggle.getAttribute("aria-label"), "Ocultar senha");
  assert.equal(toggle.getAttribute("aria-pressed"), "true");
  await act(() => toggle.click());
  assert.equal(field("password").type, "password");
  assert.equal(field("password").value, values.password);
  assert.equal(calls.mock.callCount(), 0);
  assert.equal(container.querySelector('[role="alert"]'), null);
});

test("senha e confirmação do cadastro possuem controles independentes e retornam ocultas após sucesso", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ user }));
  await act(() => root.render(<AuthForm mode="register" onAuthenticated={async () => {}} />));
  await fill(values);
  const passwordToggle = container.querySelector<HTMLButtonElement>('button[aria-controls="auth-password"]')!;
  const confirmationToggle = container.querySelector<HTMLButtonElement>('button[aria-controls="auth-confirmPassword"]')!;
  assert.equal(container.querySelectorAll('button[aria-pressed]').length, 2);
  assert.equal(confirmationToggle.getAttribute("aria-label"), "Mostrar confirmação de senha");
  await act(() => passwordToggle.click());
  assert.equal(field("password").type, "text");
  assert.equal(field("confirmPassword").type, "password");
  await act(() => confirmationToggle.click());
  assert.equal(field("password").type, "text");
  assert.equal(field("confirmPassword").type, "text");
  assert.equal(confirmationToggle.getAttribute("aria-label"), "Ocultar confirmação de senha");
  await act(() => passwordToggle.click());
  assert.equal(field("password").type, "password");
  assert.equal(field("confirmPassword").type, "text");
  assert.equal(field("password").value, values.password);
  assert.equal(field("confirmPassword").value, values.confirmPassword);
  assert.match(container.textContent!, /As senhas são iguais/);
  assert.match(container.textContent!, /4 de 4 critérios atendidos/);
  assert.equal(calls.mock.callCount(), 0);
  await submit();
  assert.equal(calls.mock.callCount(), 1);
  assert.equal(field("password").type, "password");
  assert.equal(field("confirmPassword").type, "password");
  assert.equal(field("password").value, "");
  assert.equal(field("confirmPassword").value, "");
});

test("cadastro envia nome e credenciais por REST; falha preserva os campos para nova tentativa", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ message: "privado" }, { status: 409 }));
  await act(() => root.render(<AuthForm mode="register" onAuthenticated={async () => {}} />));
  await fill(values);
  await submit();
  assert.equal(calls.mock.calls[0].arguments[0], "/api/auth/register");
  assert.equal(field("name").value, values.name);
  assert.equal(field("password").value, values.password);
  assert.equal(field("confirmPassword").value, values.confirmPassword);
  assert.match(container.textContent!, /já está cadastrado/);
  assert.doesNotMatch(container.textContent!, /privado/);
  assert.equal(container.querySelector("fieldset")!.disabled, false);
});

test("critérios e confirmação acompanham os dois campos durante a digitação, sem erros antecipados", async () => {
  await act(() => root.render(<AuthForm mode="register" onAuthenticated={async () => {}} />));
  const met = (id: string) => container.querySelector(`[data-criterion="${id}"]`)!.getAttribute("data-met");
  assert.equal(container.querySelectorAll('[data-met="true"]').length, 0);
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.match(container.textContent!, /Pelo menos um caractere especial, ex\.: @, !, #/);
  for (const [password, length, uppercase, number, special] of [
    ["abcdefgh", "true", "false", "false", "false"], ["Abcdefgh", "true", "true", "false", "false"],
    ["Abcdefg1", "true", "true", "true", "false"], ["Abcdef1!", "true", "true", "true", "true"],
    ["A12345678901234!", "false", "true", "true", "true"],
  ]) {
    await fill({ password });
    assert.equal(met("length"), length);
    assert.equal(met("uppercase"), uppercase);
    assert.equal(met("number"), number);
    assert.equal(met("special"), special);
    assert.equal(field("password").value, password);
    assert.equal(container.querySelector('[role="alert"]'), null);
  }
  await fill({ password: values.password, confirmPassword: "Teste12" });
  assert.match(container.textContent!, /4 de 4 critérios atendidos/);
  assert.match(container.querySelector("#auth-confirmPassword-help")!.textContent!, /ainda não são iguais/);
  await fill({ confirmPassword: values.password });
  assert.match(container.querySelector("#auth-confirmPassword-help")!.textContent!, /As senhas são iguais/);
  await fill({ password: "Teste124!" });
  assert.match(container.querySelector("#auth-confirmPassword-help")!.textContent!, /ainda não são iguais/);
  assert.equal(container.querySelector('[role="alert"]'), null);
});

test("confirmação divergente bloqueia cadastro, foca o campo e igualdade permite envio e limpeza", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ user }));
  let authenticated: unknown;
  await act(() => root.render(<AuthForm mode="register" onAuthenticated={async (value) => { authenticated = value; }} />));
  await fill({ ...values, password: "Teste123", confirmPassword: "Teste123" });
  await submit();
  assert.equal(calls.mock.callCount(), 0);
  assert.equal(document.activeElement, field("password"));
  assert.match(container.querySelector("#auth-password-error")!.textContent!, /caractere especial/);
  await fill({ ...values, confirmPassword: "Teste124!" });
  await submit();
  assert.equal(calls.mock.callCount(), 0);
  assert.equal(document.activeElement, field("confirmPassword"));
  assert.match(container.querySelector("#auth-confirmPassword-error")!.textContent!, /devem ser iguais/);
  await fill({ password: "Teste124!" });
  assert.equal(container.querySelector("#auth-confirmPassword-error"), null);
  await fill({ password: values.password });
  assert.match(container.querySelector("#auth-confirmPassword-error")!.textContent!, /devem ser iguais/);
  await fill({ confirmPassword: values.password });
  await submit();
  assert.equal(calls.mock.callCount(), 1);
  const options = calls.mock.calls[0].arguments[1] as RequestInit;
  assert.deepEqual(JSON.parse(options.body as string), values);
  assert.deepEqual(authenticated, user);
  assert.equal(field("password").value, "");
  assert.equal(field("confirmPassword").value, "");
});

test("login continua permitindo senhas longas existentes sem confirmação", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ user }));
  await act(() => root.render(<AuthForm mode="login" onAuthenticated={async () => {}} />));
  const password = "Uma frase secreta longa 123!";
  await fill({ email: values.email, password });
  await submit();
  assert.equal(calls.mock.callCount(), 1);
  const options = calls.mock.calls[0].arguments[1] as RequestInit;
  assert.deepEqual(JSON.parse(options.body as string), { email: values.email, password });
});

test("navegação e painel compartilham /me e logout atualiza a sessão sem guardar credenciais", async () => {
  const urls: string[] = [];
  mock.method(globalThis, "fetch", async (url: string) => {
    urls.push(url);
    return url.endsWith("logout") ? new Response(null, { status: 204 }) : Response.json({ user });
  });
  await act(async () => root.render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 5000 }}><SiteHeader /><AuthPanel mode="login" /></SWRConfig>));
  assert.deepEqual(urls, ["/api/auth/me"]);
  assert.match(container.textContent!, /Você está conectado/);
  assert.equal(container.querySelector('a[href="/account"]')!.textContent, "Minha conta");
  const button = Array.from(container.querySelectorAll("button")).find((element) => element.textContent === "Sair da conta")!;
  await act(async () => button.click());
  assert.deepEqual(urls, ["/api/auth/me", "/api/auth/logout"]);
  assert.match(container.textContent!, /Você saiu da sua conta/);
  assert.equal(container.querySelector('a[href="/login"]')!.textContent, "Entrar");
  assert.equal(dom.window.localStorage.length, 0);
  assert.equal(dom.window.sessionStorage.length, 0);
});

test("USER não recebe links administrativos, inclusive quando o retorno solicitado é /admin", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ user }));
  await act(async () => root.render(<SWRConfig value={{ provider: () => new Map() }}><SiteHeader /><AuthPanel mode="login" destination="/admin" /></SWRConfig>));
  assert.equal(container.querySelector('a[href="/admin"]'), null);
  assert.match(container.textContent!, /Sua conta não tem permissão administrativa/);
  assert.ok(container.querySelector('a[href="/account"]'));
});

test("ADMIN recebe links de conta/administração e o menu móvel mantém teclado/Escape", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ user: { ...user, role: "ADMIN" } }));
  await act(async () => root.render(<SWRConfig value={{ provider: () => new Map() }}><SiteHeader /><AuthPanel mode="login" destination="/admin" /></SWRConfig>));
  assert.equal(container.querySelectorAll('a[href="/admin"]').length, 2);
  assert.match(container.textContent!, /Continuar para administração/);
  const menu = container.querySelector<HTMLButtonElement>('button[aria-controls="primary-navigation"]')!;
  await act(() => menu.click());
  assert.equal(menu.getAttribute("aria-expanded"), "true");
  await act(() => menu.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  assert.equal(menu.getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, menu);
});

test("falha na verificação da sessão oferece nova tentativa e falha no logout mantém a sessão visível", async () => {
  let failLookup = true;
  mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("logout") || failLookup) throw new Error("Falha de rede");
    return Response.json({ user });
  });
  await act(async () => root.render(<SWRConfig value={{ provider: () => new Map() }}><AuthPanel mode="login" /></SWRConfig>));
  assert.match(container.textContent!, /Não foi possível verificar/);
  failLookup = false;
  await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
  assert.match(container.textContent!, /Você está conectado/);
  const button = Array.from(container.querySelectorAll("button")).find((element) => element.textContent === "Sair da conta")!;
  await act(async () => button.click());
  assert.match(container.textContent!, /Não foi possível confirmar a saída/);
  assert.match(container.textContent!, /Você está conectado/);
});

test("verificação inicial da sessão permanece em loading até a resposta real", async () => {
  let finish!: (response: Response) => void;
  mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { finish = resolve; }));
  await act(async () => root.render(<SWRConfig value={{ provider: () => new Map() }}><AuthPanel mode="login" /></SWRConfig>));
  assert.match(container.textContent!, /Verificando sua sessão/);
  assert.equal(container.querySelector("form"), null);
  assert.ok(container.querySelector('[role="status"] svg[aria-hidden="true"]'));
  await act(async () => { finish(Response.json({ message: "ausente" }, { status: 401 })); });
  assert.ok(container.querySelector("form"));
  assert.doesNotMatch(container.textContent!, /Verificando sua sessão/);
});

test("logout mostra progresso, bloqueia duplicação e confirma saída somente após resposta", async () => {
  let finish!: (response: Response) => void;
  const calls = mock.method(globalThis, "fetch", (url: string) => url.endsWith("me")
    ? Promise.resolve(Response.json({ user })) : new Promise<Response>((resolve) => { finish = resolve; }));
  await act(async () => root.render(<SWRConfig value={{ provider: () => new Map() }}><AuthPanel mode="login" /></SWRConfig>));
  const button = Array.from(container.querySelectorAll("button")).find((element) => element.textContent === "Sair da conta")!;
  await act(async () => { button.click(); button.click(); });
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute("aria-busy"), "true");
  assert.match(button.textContent!, /Saindo/);
  assert.doesNotMatch(container.textContent!, /Você saiu da sua conta/);
  assert.equal(calls.mock.callCount(), 2);
  await act(async () => { finish(new Response(null, { status: 204 })); });
  assert.match(container.textContent!, /Você saiu da sua conta/);
  assert.ok(container.querySelector("form"));
  await fill({ email: values.email, password: values.password });
  await submit();
  assert.match(container.textContent!, /Entrando/);
  assert.doesNotMatch(container.textContent!, /Você saiu da sua conta/);
  await act(async () => { finish(Response.json({ message: "falha simulada" }, { status: 500 })); });
  assert.ok(container.querySelector('[role="alert"]'));
});

test("cadastro mantém o indicador até a confirmação e libera os campos em falha", async () => {
  let finish!: (response: Response) => void;
  const calls = mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { finish = resolve; }));
  await act(() => root.render(<AuthForm mode="register" onAuthenticated={async () => {}} />));
  await fill(values);
  await submit();
  const button = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  assert.match(button.textContent!, /Criando conta/);
  assert.equal(button.disabled, true);
  await submit();
  assert.equal(calls.mock.callCount(), 1);
  await act(async () => { finish(Response.json({ message: "falha" }, { status: 500 })); });
  assert.equal(button.disabled, false);
  assert.equal(button.getAttribute("aria-busy"), "false");
  assert.equal(button.textContent, "Criar conta");
  assert.equal(field("password").value, values.password);
  assert.ok(container.querySelector('[role="alert"]'));
});
