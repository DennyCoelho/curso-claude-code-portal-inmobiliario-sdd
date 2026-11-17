import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { fetchAuthorizedUser } from "../src/lib/api/authorization";
import { getLoginDestination } from "../src/lib/auth-navigation";

const user = { id: "a2050000-0000-4000-8000-000000000001", name: "João Teste", email: "joao@example.com", role: "USER" };
const cookie = `__Host-portal_session=${"a".repeat(64)}`;
afterEach(() => mock.restoreAll());

test("retorno do login aceita somente caminhos privados conhecidos e recusa redirecionamentos externos/repetidos", () => {
  assert.equal(getLoginDestination("/admin"), "/admin");
  for (const value of [undefined, "/account", "https://evil.example", "//evil.example", "/\\evil.example", "/admin?next=//evil.example", ["/admin", "/account"]]) {
    assert.equal(getLoginDestination(value), "/account");
  }
});

test("verificação no servidor encaminha somente cookies de sessão para API fixa, sem cache nem redirecionamentos", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ user }));
  assert.deepEqual(await fetchAuthorizedUser(`theme=dark; ${cookie}; analytics=privado`, "USER", "http://localhost:3001/"), { status: "authenticated", user });
  assert.equal(calls.mock.calls[0].arguments[0], "http://localhost:3001/api/auth/me");
  const options = calls.mock.calls[0].arguments[1] as RequestInit;
  assert.equal(options.cache, "no-store");
  assert.equal(options.redirect, "error");
  assert.deepEqual(options.headers, { Accept: "application/json", Cookie: cookie });
  assert.ok(options.signal instanceof AbortSignal);
  calls.mock.mockImplementation(async () => Response.json({ user: { ...user, role: "ADMIN" } }));
  assert.equal((await fetchAuthorizedUser(cookie, "ADMIN", "http://localhost:3001")).status, "authenticated");
  assert.equal(calls.mock.calls[1].arguments[0], "http://localhost:3001/api/admin/session");
});

test("sessão ausente/malformada não consulta a API e duplicados são preservados para recusa do backend", async () => {
  const calls = mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  for (const value of ["", "theme=dark", "portal_session=ADMIN"]) {
    assert.equal((await fetchAuthorizedUser(value, "USER", "http://localhost:3001")).status, "unauthenticated");
  }
  assert.equal(calls.mock.callCount(), 0);
  assert.equal((await fetchAuthorizedUser(`${cookie}; ${cookie}`, "ADMIN", "http://localhost:3001")).status, "unauthenticated");
  assert.equal((calls.mock.calls[0].arguments[1] as RequestInit).headers && new Headers((calls.mock.calls[0].arguments[1] as RequestInit).headers).get("Cookie"), `${cookie}; ${cookie}`);
});

test("401/403 impedem acesso e USER é recusado na administração mesmo com resposta 200 incompatível", async () => {
  const calls = mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  assert.equal((await fetchAuthorizedUser(cookie, "ADMIN", "http://localhost:3001")).status, "unauthenticated");
  calls.mock.mockImplementation(async () => new Response(null, { status: 403 }));
  assert.equal((await fetchAuthorizedUser(cookie, "ADMIN", "http://localhost:3001")).status, "forbidden");
  calls.mock.mockImplementation(async () => Response.json({ user }));
  assert.equal((await fetchAuthorizedUser(cookie, "ADMIN", "http://localhost:3001")).status, "forbidden");
});

test("API indisponível, contrato inválido e falhas de rede impedem renderização com erro genérico", async () => {
  const calls = mock.method(globalThis, "fetch", async () => new Response("segredo", { status: 500 }));
  await assert.rejects(fetchAuthorizedUser(cookie, "USER", "http://localhost:3001"), { message: "Não foi possível verificar seu acesso. Tente novamente." });
  for (const body of [{ user: { ...user, role: "OWNER" } }, { user: { ...user, passwordHash: "segredo" } }, {}]) {
    calls.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchAuthorizedUser(cookie, "USER", "http://localhost:3001"), /Não foi possível verificar/);
  }
  calls.mock.mockImplementation(async () => { throw new Error("token privado"); });
  await assert.rejects(fetchAuthorizedUser(cookie, "USER", "http://localhost:3001"), { message: "Não foi possível verificar seu acesso. Tente novamente." });
});
