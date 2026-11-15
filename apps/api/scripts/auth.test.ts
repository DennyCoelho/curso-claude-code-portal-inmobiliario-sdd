import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { authResponseSchema, getPasswordCriteria, loginSchema, registerSchema } from "@portal-inmobiliario/contracts/auth";
import { POST as register } from "../src/app/api/auth/register/route";
import { POST as login } from "../src/app/api/auth/login/route";
import { POST as logout } from "../src/app/api/auth/logout/route";
import { GET as me } from "../src/app/api/auth/me/route";
import { AuthError } from "../src/lib/auth/error";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { hashToken, newSession, readSessionToken, sessionCookieName, setSessionCookie, SESSION_SECONDS } from "../src/lib/auth/session";
import type { AuthRepository } from "../src/repositories/auth-repository";
import { authService, createAuthService } from "../src/services/auth-service";

const input = { name: "João de Souza", email: "joao@example.com", password: "Teste123!", confirmPassword: "Teste123!" };
const user = { id: "a2050000-0000-4000-8000-000000000001", name: input.name, email: input.email, role: "USER" as const };
const originalEnvironment = { NODE_ENV: process.env.NODE_ENV, AUTH_TRUSTED_ORIGINS: process.env.AUTH_TRUSTED_ORIGINS };
afterEach(() => {
  mock.restoreAll();
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function request(path: string, body: unknown = input, headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3001/api/auth/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
}

function memoryRepository() {
  let stored: (typeof user & { passwordHash: string; isActive: boolean }) | null = null;
  const sessions = new Map<string, { expiresAt: Date; user: typeof user & { isActive: boolean } }>();
  const repository: AuthRepository = {
    async register(data, session) {
      if (stored) throw new AuthError(409, "E-mail em uso.");
      stored = { ...user, ...data, isActive: true };
      sessions.set(session.tokenHash, { expiresAt: session.expiresAt, user: stored });
      return stored;
    },
    async findByEmail() { return stored; },
    async createSession(_id, session) { sessions.set(session.tokenHash, { expiresAt: session.expiresAt, user: stored! }); },
    async findSession(hash) { return sessions.get(hash) ?? null; },
    async deleteSession(hash) { sessions.delete(hash); },
    async consumeAttempt() { return true; },
  };
  return { repository, sessions, get stored() { return stored; } };
}

test("contratos de cadastro/login normalizam e-mail, preservam senha e rejeitam elevação de perfil", () => {
  assert.deepEqual(registerSchema.parse({ ...input, name: "  João de Souza  ", email: " JOAO@EXAMPLE.COM " }), input);
  assert.equal(loginSchema.parse({ email: input.email, password: ` ${input.password} ` }).password, ` ${input.password} `);
  for (const patch of [{ role: "ADMIN" }, { isActive: true }, { id: user.id }, { name: "a" }, { name: "a\nBcc" }, { email: "inválido" }, { password: "a".repeat(14) }, { password: "a".repeat(129) }]) {
    assert.equal(registerSchema.safeParse({ ...input, ...patch }).success, false);
  }
  assert.equal(loginSchema.safeParse(input).success, false);
  assert.equal(authResponseSchema.safeParse({ user: { ...user, passwordHash: "privado" } }).success, false);
});

test("scrypt usa salt aleatório, parâmetros de custo fixos e comparação da senha completa", async () => {
  const first = await hashPassword(input.password);
  const second = await hashPassword(input.password);
  assert.notEqual(first, second);
  assert.match(first, /^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.equal(await verifyPassword(input.password, first), true);
  assert.equal(await verifyPassword(`${input.password} `, first), false);
  assert.equal(await verifyPassword(input.password, null), false);
  assert.equal(await verifyPassword(input.password, "scrypt$999999999$8$1$adulterado"), false);
});

test("cadastro exige 8–15 caracteres, maiúscula, número, especial e confirmação igual, sem bloquear sequências", () => {
  for (const password of ["Teste12@", "A123456!", "A1234567890123!", "Ábcdef1#", "Teste12!", " TESTE1! ", "A1😀😀😀😀😀😀"]) {
    assert.equal(registerSchema.safeParse({ ...input, password, confirmPassword: password }).success, true, password);
    assert.ok(getPasswordCriteria(password).every((criterion) => criterion.met));
  }
  for (const password of ["Ab1234!", "A12345678901234!", "teste12!", "TESTEAB!", "1234567!", "Teste123", " Teste12 ", "Teste12\n", "A1😀😀😀😀😀"]) {
    const result = registerSchema.safeParse({ ...input, password, confirmPassword: password });
    assert.equal(result.success, false, password);
    if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path[0] === "password"));
  }
  for (const special of ["@", "!", "#", "$", "%", "&", "*", "_", "-", ".", "+", "="]) {
    const password = `Teste12${special}`;
    assert.equal(registerSchema.safeParse({ ...input, password, confirmPassword: password }).success, true);
  }
  for (const confirmPassword of ["", "Teste124", "teste123", "Teste123 "]) {
    const result = registerSchema.safeParse({ ...input, confirmPassword });
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path[0] === "confirmPassword"));
  }
  const { confirmPassword: omitted, ...withoutConfirmation } = input;
  assert.ok(omitted);
  assert.equal(registerSchema.safeParse(withoutConfirmation).success, false);
});

test("login aceita senhas antigas sem aplicar composição ou confirmação, preservando espaços", () => {
  for (const password of ["antiga", "Uma frase secreta longa 123!", " senha antiga ", "a".repeat(128)]) {
    assert.equal(loginSchema.parse({ email: input.email, password }).password, password);
  }
  for (const password of ["", "a".repeat(129)]) assert.equal(loginSchema.safeParse({ email: input.email, password }).success, false);
});

test("cadastro, login e logout criam/rotacionam/revogam sessões sem expor dados internos", async () => {
  const memory = memoryRepository();
  const service = createAuthService(memory.repository);
  const registered = await service.register(input);
  assert.deepEqual(registered.user, user);
  assert.notEqual(memory.stored!.passwordHash, input.password);
  assert.equal(memory.sessions.has(registered.token), false);
  assert.deepEqual(await service.me(registered.token), user);
  const logged = await service.login({ email: input.email, password: input.password }, registered.token);
  assert.notEqual(logged.token, registered.token);
  await assert.rejects(service.me(registered.token), { status: 401 });
  assert.deepEqual(await service.me(logged.token), user);
  await service.logout(logged.token);
  await service.logout(logged.token);
  await service.logout(null);
  await assert.rejects(service.me(logged.token), { status: 401 });
  assert.equal(memory.sessions.size, 0);
});

test("hashing recusa excesso de concorrência sem acumular trabalho em memória", async () => {
  const results = await Promise.allSettled(Array.from({ length: 3 }, () => hashPassword(input.password)));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 2);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected?.status === "rejected" && rejected.reason instanceof AuthError);
  assert.equal(rejected.reason.status, 503);
  // O limite é liberado ao concluir, permitindo a próxima solicitação.
  assert.match(await hashPassword(input.password), /^scrypt\$/);
});

test("senha errada, conta ausente e conta inativa produzem o mesmo erro de login", async () => {
  const memory = memoryRepository();
  const service = createAuthService(memory.repository);
  const credentials = { email: input.email, password: input.password };
  const expected = { status: 401, message: "E-mail ou senha inválidos." };
  await assert.rejects(service.login(credentials), expected);
  const registered = await service.register(input);
  await assert.rejects(service.login({ ...credentials, password: "Senha errada comprida" }), expected);
  memory.stored!.isActive = false;
  await assert.rejects(service.login(credentials), expected);
  await assert.rejects(service.me(registered.token), { status: 401 });
  assert.equal(memory.sessions.size, 0);
});

test("sessão expira no limite absoluto e token adulterado é recusado", async () => {
  let now = new Date("2026-11-15T12:00:00Z");
  const memory = memoryRepository();
  const service = createAuthService(memory.repository, () => now);
  const registered = await service.register(input);
  await assert.rejects(service.me("adulterado"), { status: 401 });
  now = new Date(now.getTime() + SESSION_SECONDS * 1000);
  await assert.rejects(service.me(registered.token), { status: 401 });
  assert.equal(memory.sessions.size, 0);
});

test("limite de tentativas interrompe login/cadastro antes da consulta e hashing", async () => {
  const memory = memoryRepository();
  mock.method(memory.repository, "consumeAttempt", async () => false);
  const lookup = mock.method(memory.repository, "findByEmail");
  const service = createAuthService(memory.repository);
  await assert.rejects(service.login(input), { status: 429 });
  await assert.rejects(service.register(input), { status: 429 });
  assert.equal(lookup.mock.callCount(), 0);
});

test("cookie é HttpOnly e SameSite, usa Secure/__Host em produção e expira no logout", () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  const session = newSession(new Date());
  assert.equal(session.token.length, 64);
  assert.equal(session.tokenHash, hashToken(session.token));
  assert.notEqual(session.tokenHash, session.token);
  const response = setSessionCookie(new Response(), session.token);
  const cookie = response.headers.get("set-cookie")!;
  for (const expected of ["__Host-portal_session=", "HttpOnly", "Secure", "SameSite=Lax", "Path=/", `Max-Age=${SESSION_SECONDS}`]) assert.ok(cookie.includes(expected));
  assert.doesNotMatch(cookie, /Domain=/);
  assert.equal(readSessionToken(new Request("http://localhost", { headers: { cookie: cookie.split(";")[0] } })), session.token);
  assert.equal(readSessionToken(new Request("http://localhost", { headers: { cookie: `${cookie.split(";")[0]}; ${cookie.split(";")[0]}` } })), null);
  assert.match(setSessionCookie(new Response(), null).headers.get("set-cookie")!, /Max-Age=0/);
  Object.assign(process.env, { NODE_ENV: "development" });
  assert.equal(sessionCookieName(), "portal_session");
  assert.doesNotMatch(setSessionCookie(new Response(), session.token).headers.get("set-cookie")!, /; Secure/);
});

test("rotas retornam usuário público e cookie, leem sessão e encerram sem corpo", async () => {
  const token = "a".repeat(64);
  mock.method(authService, "register", async () => ({ user, token }));
  mock.method(authService, "login", async () => ({ user, token }));
  const lookup = mock.method(authService, "me", async () => user);
  const revoke = mock.method(authService, "logout", async () => {});
  for (const [handler, body, status] of [[register, input, 201], [login, { email: input.email, password: input.password }, 200]] as const) {
    const response = await handler(request("login", body, { origin: "http://localhost:3000" }));
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { user });
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  const headers = { cookie: `${sessionCookieName()}=${token}` };
  assert.equal((await me(new Request("http://localhost/api/auth/me", { headers }))).status, 200);
  assert.equal(lookup.mock.calls[0].arguments[0], token);
  const response = await logout(new Request("http://localhost/api/auth/logout", { method: "POST", headers }));
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(revoke.mock.calls[0].arguments[0], token);
  assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
});

test("rotas rejeitam JSON, limites reais, campos arbitrários e origens inválidas antes do serviço", async () => {
  const calls = mock.method(authService, "register");
  const invalid = [
    [request("register", { ...input, role: "ADMIN" }), 400],
    [request("register", input, { "Content-Type": "text/plain" }), 415],
    [request("register", input, { origin: "https://outro.example" }), 403],
    [request("register", input, { origin: "null" }), 403],
    [request("register", input, { "sec-fetch-site": "cross-site" }), 403],
    [request("register", { ...input, name: "é".repeat(4100) }, { "Content-Length": "10" }), 413],
    [new Request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }), 400],
  ] as const;
  for (const [req, status] of invalid) assert.equal((await register(req)).status, status);
  assert.equal(calls.mock.callCount(), 0);
  assert.equal((await logout(request("logout", {}, { origin: "https://outro.example" }))).status, 403);
});

test("origem pública configurada é aceita sem confiar em Host encaminhado", async () => {
  process.env.AUTH_TRUSTED_ORIGINS = "https://portal.example";
  mock.method(authService, "login", async () => ({ user, token: "a".repeat(64) }));
  const body = { email: input.email, password: input.password };
  assert.equal((await login(request("login", body, { origin: "https://portal.example" }))).status, 200);
  assert.equal((await login(request("login", body, { origin: "https://evil.example", "x-forwarded-host": "evil.example" }))).status, 403);
});

test("falhas internas são genéricas, limite inclui Retry-After e /me inválido limpa cookie", async () => {
  mock.method(authService, "login", async () => { throw new Error("credencial interna"); });
  const failed = await login(request("login", { email: input.email, password: input.password }));
  assert.equal(failed.status, 500);
  assert.doesNotMatch(await failed.text(), /credencial interna/);
  mock.method(authService, "me", async () => { throw new AuthError(401, "Entre na conta."); });
  const absent = await me(new Request("http://localhost/api/auth/me"));
  assert.equal(absent.status, 401);
  assert.match(absent.headers.get("set-cookie")!, /Max-Age=0/);
  mock.method(authService, "register", async () => { throw new AuthError(429, "Muitas tentativas."); });
  const limited = await register(request("register"));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "900");
});
