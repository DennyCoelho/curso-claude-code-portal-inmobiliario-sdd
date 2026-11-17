import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { hasAccessRole, type AuthenticatedUser, type UserRole } from "@portal-inmobiliario/contracts/auth";
import { GET as adminSession } from "../src/app/api/admin/session/route";
import { withAuthorization } from "../src/lib/auth/authorization";
import { AuthError } from "../src/lib/auth/error";
import { newSession, sessionCookieName } from "../src/lib/auth/session";
import { createAuthRepository } from "../src/repositories/auth-repository";
import { authService, createAuthService } from "../src/services/auth-service";
import { createAuthorizationService } from "../src/services/authorization-service";

const user = { id: "a2050000-0000-4000-8000-000000000001", name: "João Teste", email: "joao@example.com", role: "USER" as UserRole };
const token = "a".repeat(64);
afterEach(() => mock.restoreAll());
const request = (headers: Record<string, string> = {}) => new Request("http://localhost:3001/api/admin/session", { headers: { Cookie: `${sessionCookieName()}=${token}`, ...headers } });

test("hierarquia permite USER/ADMIN na conta e somente ADMIN na administração, recusando perfis desconhecidos", () => {
  assert.equal(hasAccessRole("USER", "USER"), true);
  assert.equal(hasAccessRole("ADMIN", "USER"), true);
  assert.equal(hasAccessRole("ADMIN", "ADMIN"), true);
  assert.equal(hasAccessRole("USER", "ADMIN"), false);
  assert.equal(hasAccessRole("OWNER" as UserRole, "USER"), false);
  assert.equal(hasAccessRole("ADMIN", "OWNER" as UserRole), false);
});

test("serviço consulta a sessão em cada autorização e reflete promoção/rebaixamento imediatamente", async () => {
  let role: UserRole = "USER";
  const authentication = { me: mock.fn(async () => ({ ...user, role })) };
  const service = createAuthorizationService(authentication);
  assert.deepEqual(await service.requireUser(token), user);
  await assert.rejects(service.requireUser(token, "ADMIN"), { status: 403 });
  role = "ADMIN";
  assert.equal((await service.requireUser(token, "ADMIN")).role, "ADMIN");
  assert.equal((await service.requireUser(token, "USER")).role, "ADMIN");
  role = "USER";
  await assert.rejects(service.requireUser(token, "ADMIN"), { status: 403 });
  assert.equal(authentication.me.mock.callCount(), 5);
});

test("guard recusa sessão ausente, adulterada, expirada e inativa antes de executar recurso", async () => {
  const session = newSession(new Date());
  const repository = createAuthRepository();
  const lookup = mock.method(repository, "findSession", async () => ({ expiresAt: session.expiresAt, user: { ...user, role: "ADMIN" as UserRole, isActive: true } }));
  mock.method(repository, "deleteSession", async () => {});
  const authentication = createAuthService(repository);
  mock.method(authService, "me", authentication.me);
  const handle = mock.fn(() => Response.json({ private: true }));
  for (const cookie of ["", `${sessionCookieName()}=ADMIN`, `${sessionCookieName()}=${token}; ${sessionCookieName()}=${token}`]) {
    const response = await withAuthorization(request({ Cookie: cookie, "x-user-role": "ADMIN", "x-user-id": user.id, Authorization: "Bearer ADMIN" }), "ADMIN", handle);
    assert.equal(response.status, 401);
    assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
  }
  assert.equal(lookup.mock.callCount(), 0);
  lookup.mock.mockImplementation(async () => ({ expiresAt: new Date(0), user: { ...user, role: "ADMIN" as const, isActive: true } }));
  assert.equal((await withAuthorization(request(), "ADMIN", handle)).status, 401);
  lookup.mock.mockImplementation(async () => ({ expiresAt: session.expiresAt, user: { ...user, role: "ADMIN" as const, isActive: false } }));
  assert.equal((await withAuthorization(request(), "ADMIN", handle)).status, 401);
  assert.equal(handle.mock.callCount(), 0);
});

test("API administrativa retorna 403 para USER sem apagar sessão e 200 para ADMIN com contrato público", async () => {
  const lookup = mock.method(authService, "me", async () => user);
  const denied = await adminSession(request({ "x-user-role": "ADMIN" }));
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("set-cookie"), null);
  assert.deepEqual(await denied.json(), { message: "Você não tem permissão para acessar este recurso.", status: 403 });
  lookup.mock.mockImplementation(async () => ({ ...user, role: "ADMIN" as const }));
  const allowed = await adminSession(request());
  assert.equal(allowed.status, 200);
  assert.deepEqual(await allowed.json(), { user: { ...user, role: "ADMIN" } });
  for (const response of [denied, allowed]) {
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("vary"), "Cookie");
  }
  assert.equal(lookup.mock.calls[0].arguments[0], token);
});

test("guard valida origem das escritas e só executa callback depois da autorização", async () => {
  const lookup = mock.method(authService, "me", async () => ({ ...user, role: "ADMIN" as const }));
  const handle = mock.fn((authenticatedUser: AuthenticatedUser) => {
    assert.equal(authenticatedUser.role, "ADMIN");
    return new Response(null, { status: 204, headers: { Vary: "Accept" } });
  });
  for (const headers of [{ Origin: "https://invalid.example" }, { "Sec-Fetch-Site": "cross-site" }] as Record<string, string>[]) {
    const response = await withAuthorization(new Request(request(), { method: "DELETE", headers: { ...headers, Cookie: `${sessionCookieName()}=${token}` } }), "ADMIN", handle);
    assert.equal(response.status, 403);
  }
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal(handle.mock.callCount(), 0);
  const allowed = await withAuthorization(new Request(request(), { method: "DELETE" }), "ADMIN", handle);
  assert.equal(allowed.status, 204);
  assert.deepEqual(handle.mock.calls[0].arguments[0], { ...user, role: "ADMIN" });
  assert.equal(allowed.headers.get("vary"), "Accept, Cookie");
  assert.equal(allowed.headers.get("cache-control"), "no-store");
});

test("falhas de autenticação e persistência bloqueiam callback e usam erros genéricos sem cache", async () => {
  const lookup = mock.method(authService, "me", async () => { throw new Error("segredo do banco"); });
  const handle = mock.fn(() => Response.json({ private: true }));
  const failed = await withAuthorization(request(), "ADMIN", handle);
  assert.equal(failed.status, 500);
  assert.doesNotMatch(await failed.text(), /segredo|private/);
  assert.equal(failed.headers.get("cache-control"), "no-store");
  lookup.mock.mockImplementation(async () => { throw new AuthError(401, "Entre na sua conta para continuar."); });
  assert.equal((await withAuthorization(request(), "ADMIN", handle)).status, 401);
  assert.equal(handle.mock.callCount(), 0);
});
