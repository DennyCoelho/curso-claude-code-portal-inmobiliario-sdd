import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { forgotPasswordSchema, resetPasswordSchema, PASSWORD_RECOVERY_MESSAGE } from "@portal-inmobiliario/contracts/auth";
import { POST as forgot } from "../src/app/api/auth/forgot-password/route";
import { POST as reset } from "../src/app/api/auth/reset-password/route";
import { hashToken } from "../src/lib/auth/session";
import { AuthError } from "../src/lib/auth/error";
import { verifyPassword } from "../src/lib/auth/password";
import { recoveryEmailConfiguration, sendRecoveryEmail } from "../src/lib/auth/recovery-email";
import type { PasswordResetRepository } from "../src/repositories/password-reset-repository";
import { createPasswordResetService, passwordResetService, INVALID_RESET_LINK, RESET_SECONDS } from "../src/services/password-reset-service";

const token = "a".repeat(64);
const input = { token, password: "Nova123!", confirmPassword: "Nova123!" };
const configuration = { apiKey: "chave-simulada", from: "conta@example.com", origin: "https://portal.example.com" };
const environment = Object.fromEntries(["WEB_URL", "RESEND_API_KEY", "AUTH_EMAIL_FROM", "AUTH_TRUSTED_ORIGINS"].map((name) => [name, process.env[name]]));
afterEach(() => {
  mock.restoreAll();
  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

function fixture() {
  let active = true;
  let exists = true;
  let now = new Date();
  let stored: { tokenHash: string; expiresAt: Date } | null = null;
  let passwordHash = "anterior";
  let sessions = 2;
  const tasks: (() => Promise<void>)[] = [];
  const sent: string[] = [];
  const attempts = { async consumeAttempt() { return true; } };
  const mailer = { configuration: () => configuration, async send(_configuration: unknown, _email: string, value: string) { sent.push(value); } };
  const repository: PasswordResetRepository = {
    async issue(_email, data) { if (!exists || !active) return null; stored = data; return { id: "id", email: "joao@example.com" }; },
    async findValid(hash, date) { return stored?.tokenHash === hash && stored.expiresAt > date && active ? { userId: "id" } : null; },
    async consume(hash, password, clock = () => new Date()) { if (!stored || stored.tokenHash !== hash || stored.expiresAt <= clock() || !active) return false; stored = null; passwordHash = password; sessions = 0; return true; },
    async remove(hash) { if (stored?.tokenHash === hash) stored = null; },
  };
  const service = createPasswordResetService(repository, attempts, () => now, mailer);
  return {
    service, repository, mailer, attempts, tasks, sent,
    schedule: (task: () => Promise<void>) => { tasks.push(task); },
    set active(value: boolean) { active = value; }, set exists(value: boolean) { exists = value; },
    advance(seconds: number) { now = new Date(now.getTime() + seconds * 1000); },
    get stored() { return stored; }, get passwordHash() { return passwordHash; }, get sessions() { return sessions; },
  };
}

test("contratos normalizam e-mail e exigem token, política de senha e confirmação sem campos extras", () => {
  assert.deepEqual(forgotPasswordSchema.parse({ email: " JOAO@EXAMPLE.COM " }), { email: "joao@example.com" });
  assert.equal(forgotPasswordSchema.safeParse({ email: "inválido" }).success, false);
  assert.equal(forgotPasswordSchema.safeParse({ email: "joao@example.com", role: "ADMIN" }).success, false);
  assert.equal(resetPasswordSchema.safeParse(input).success, true);
  for (const patch of [{ token: "x" }, { password: "fraca" }, { confirmPassword: "Outra123!" }, { email: "joao@example.com" }]) {
    assert.equal(resetPasswordSchema.safeParse({ ...input, ...patch }).success, false);
  }
});

test("emissão guarda somente hash e validade de 30 minutos, envia depois da resposta e substitui o link", async () => {
  const f = fixture();
  const before = Date.now();
  await f.service.request({ email: "joao@example.com" }, f.schedule);
  assert.equal(f.sent.length, 0);
  assert.equal(f.sessions, 2);
  assert.equal(f.passwordHash, "anterior");
  assert.ok(Math.abs(f.stored!.expiresAt.getTime() - before - RESET_SECONDS * 1000) < 500);
  await f.tasks[0]();
  assert.match(f.sent[0], /^[a-f0-9]{64}$/);
  assert.equal(f.stored!.tokenHash, hashToken(f.sent[0]));
  assert.notEqual(f.stored!.tokenHash, f.sent[0]);
  await f.service.request({ email: "joao@example.com" }, f.schedule);
  await assert.rejects(f.service.reset({ ...input, token: f.sent[0] }), { status: 400, message: INVALID_RESET_LINK });
  await f.tasks[1]();
  await f.service.reset({ ...input, token: f.sent[1] });
  assert.equal(f.stored, null);
  assert.equal(f.sessions, 0);
  assert.equal(await verifyPassword(input.password, f.passwordHash), true);
  await assert.rejects(f.service.reset({ ...input, token: f.sent[1] }), { status: 400 });
});

test("contas ausentes e inativas não recebem e-mails nem mudam senha/sessões", async () => {
  for (const field of ["active", "exists"] as const) {
    const f = fixture(); f[field] = false;
    await f.service.request({ email: "joao@example.com" }, f.schedule);
    assert.equal(f.tasks.length, 0);
    assert.equal(f.stored, null);
    assert.equal(f.sessions, 2);
  }
});

test("expiração no limite e inativação após emissão impedem redefinição", async () => {
  for (const reason of ["expired", "inactive"]) {
    const f = fixture();
    await f.service.request({ email: "joao@example.com" }, f.schedule); await f.tasks[0]();
    if (reason === "expired") f.advance(RESET_SECONDS); else f.active = false;
    await assert.rejects(f.service.reset({ ...input, token: f.sent[0] }), { status: 400 });
    assert.equal(f.passwordHash, "anterior"); assert.equal(f.sessions, 2);
  }
});

test("revalidação atômica recusa token consumido ou invalidado durante o hashing", async () => {
  const f = fixture();
  await f.service.request({ email: "joao@example.com" }, f.schedule); await f.tasks[0]();
  mock.method(f.repository, "consume", async () => false);
  await assert.rejects(f.service.reset({ ...input, token: f.sent[0] }), { status: 400 });
  assert.equal(f.passwordHash, "anterior");
});

test("limite persistente protege ambas as operações sem criar link nem alterar senha", async () => {
  const f = fixture(); mock.method(f.attempts, "consumeAttempt", async () => false);
  await assert.rejects(f.service.request({ email: "joao@example.com" }, f.schedule), { status: 429 });
  await assert.rejects(f.service.reset(input), { status: 429 });
  assert.equal(f.tasks.length, 0); assert.equal(f.passwordHash, "anterior");
});

test("falha do provedor não vaza dados, invalida só o próprio token e preserva link mais recente", async () => {
  const f = fixture();
  const warning = mock.method(console, "warn", () => {});
  mock.method(f.mailer, "send", async () => { throw new Error("segredo"); });
  await f.service.request({ email: "joao@example.com" }, f.schedule);
  await f.service.request({ email: "joao@example.com" }, f.schedule);
  const latest = f.stored;
  await f.tasks[0](); assert.equal(f.stored, latest);
  await f.tasks[1](); assert.equal(f.stored, null);
  assert.doesNotMatch(JSON.stringify(warning.mock.calls), /segredo|joao@example|chave-simulada/);
});

test("configuração exige credenciais e origem confiável sem caminhos, credenciais ou HTTP público", () => {
  process.env.RESEND_API_KEY = configuration.apiKey; process.env.AUTH_EMAIL_FROM = configuration.from;
  for (const origin of ["", "inválido", "http://portal.example.com", "https://user:senha@portal.example.com", "https://portal.example.com/pasta", "https://portal.example.com?x=1"]) {
    process.env.WEB_URL = origin;
    assert.throws(recoveryEmailConfiguration, { status: 503 });
  }
  process.env.WEB_URL = configuration.origin;
  assert.deepEqual(recoveryEmailConfiguration(), configuration);
  delete process.env.RESEND_API_KEY;
  assert.throws(recoveryEmailConfiguration, { status: 503 });
});

test("Resend recebe link com fragmento e destinatário canônico, sem segredos na URL ou repetição automática", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ id: "email-simulado" }));
  await sendRecoveryEmail(configuration, "joao@example.com", token);
  const [url, options] = calls.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.equal(url, "https://api.resend.com/emails");
  const body = JSON.parse(options.body as string);
  assert.deepEqual(body.to, ["joao@example.com"]);
  assert.ok(body.text.includes(`${configuration.origin}/reset-password#token=${token}`));
  assert.doesNotMatch(body.text, /chave-simulada/);
  for (const response of [Response.json({ error: "privado" }, { status: 500 }), Response.json({})]) {
    calls.mock.mockImplementation(async () => response);
    await assert.rejects(sendRecoveryEmail(configuration, "joao@example.com", token), { status: 503 });
  }
  assert.equal(calls.mock.callCount(), 3);
});

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3001/api/auth/recovery", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}

test("rotas validam origem, JSON, tamanho, contratos e não revelam tokens", async () => {
  const called = mock.method(passwordResetService, "request", async () => {});
  assert.equal((await forgot(request({ email: "inválido" }))).status, 400);
  assert.equal((await forgot(request({ email: "joao@example.com" }, { Origin: "https://invasor.example.com" }))).status, 403);
  assert.equal((await forgot(request({}, { "Sec-Fetch-Site": "cross-site" }))).status, 403);
  assert.equal((await forgot(request({}, { "Content-Type": "text/plain" }))).status, 415);
  assert.equal((await forgot(request({ email: "a".repeat(9000) }))).status, 413);
  const response = await forgot(request({ email: " JOAO@EXAMPLE.COM " }));
  assert.equal(response.status, 202); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { message: PASSWORD_RECOVERY_MESSAGE });
  assert.equal(called.mock.callCount(), 1);
  assert.deepEqual(called.mock.calls[0].arguments[0], { email: "joao@example.com" });
  assert.equal((await reset(request({ ...input, confirmPassword: "diferente" }))).status, 400);
  mock.method(passwordResetService, "reset", async () => {});
  const changed = await reset(request(input));
  assert.equal(changed.status, 200); assert.match(changed.headers.get("set-cookie")!, /Max-Age=0/);
  assert.doesNotMatch(JSON.stringify(await changed.json()), /token|password/);
});

test("rotas retornam erros genéricos e Retry-After sem expor detalhes internos", async () => {
  const calls = mock.method(passwordResetService, "reset", async () => { throw new Error("banco privado"); });
  const response = await reset(request(input));
  assert.equal(response.status, 500); assert.doesNotMatch(JSON.stringify(await response.json()), /banco privado/);
  calls.mock.mockImplementation(async () => { throw new AuthError(429, "Muitas tentativas."); });
  const limited = await reset(request(input));
  assert.equal(limited.status, 429); assert.equal(limited.headers.get("Retry-After"), "900");
});
