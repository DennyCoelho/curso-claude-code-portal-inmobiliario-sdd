import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { changeEmailSchema, changePasswordSchema, confirmEmailSchema, updateProfileSchema } from "@portal-inmobiliario/contracts/account";
import { PATCH as profile } from "../src/app/api/account/profile/route";
import { POST as password } from "../src/app/api/account/password/route";
import { POST as email } from "../src/app/api/account/email-change/route";
import { POST as confirm } from "../src/app/api/account/email-change/confirm/route";
import { accountService, createAccountService, EMAIL_CHANGE_SECONDS } from "../src/services/account-service";
import { authorizationService } from "../src/services/authorization-service";
import type { AccountRepository } from "../src/repositories/account-repository";
import { AuthError } from "../src/lib/auth/error";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { hashToken, sessionCookieName } from "../src/lib/auth/session";
import { sendEmailChange } from "../src/lib/auth/account-email";

const token = "a".repeat(64);
const user = { id: "a2050000-0000-4000-8000-000000000001", name: "João Teste", email: "joao@example.com", role: "USER" as const };
const currentPassword = "Atual123!";
const currentHash = await hashPassword(currentPassword);
const change = { currentPassword, newPassword: "Nova123!", confirmPassword: "Nova123!" };
const blank = { currentPassword: "", newPassword: "", confirmPassword: "" };
const configuration = { apiKey: "simulada", from: "conta@example.com", origin: "https://portal.example.com" };
afterEach(() => mock.restoreAll());

function fixture() {
  const repository: AccountRepository = {
    async credentials() { return { ...user, passwordHash: currentHash, isActive: true }; },
    async updateName(_id, _token, name) { return { ...user, name }; },
    async changePassword() { return user; },
    async issueEmailChange() {}, async removeEmailChange() {},
    async confirmEmail() { return { ...user, email: "novo@example.com" }; },
  };
  const attempts = { async consumeAttempt() { return true; } };
  const mailer: { configuration: () => typeof configuration; send: typeof sendEmailChange } = { configuration: () => configuration, async send() {} };
  return { repository, attempts, mailer, service: createAccountService(repository, attempts, () => new Date("2026-11-18T01:00:00Z"), mailer) };
}

test("contratos da conta preservam senha vazia, recusam preenchimento parcial e impedem atribuição de perfil/identidade", () => {
  assert.deepEqual(changePasswordSchema.parse(blank), blank);
  assert.equal(changePasswordSchema.safeParse(change).success, true);
  for (const patch of [{ currentPassword: "" }, { newPassword: "" }, { confirmPassword: "" }, { confirmPassword: "Outra123!" }, { newPassword: "fraca" }, { userId: user.id }, { role: "ADMIN" }]) {
    assert.equal(changePasswordSchema.safeParse({ ...change, ...patch }).success, false);
  }
  assert.deepEqual(updateProfileSchema.parse({ name: " João de Souza " }), { name: "João de Souza" });
  for (const input of [{ name: "A" }, { name: "João\nTeste" }, { name: "João", role: "ADMIN" }, { name: "João", email: "novo@example.com" }]) assert.equal(updateProfileSchema.safeParse(input).success, false);
  assert.deepEqual(changeEmailSchema.parse({ email: " NOVO@EXAMPLE.COM ", currentPassword }), { email: "novo@example.com", currentPassword });
  assert.equal(confirmEmailSchema.safeParse({ token, userId: user.id }).success, false);
});

test("salvar nome e enviar troca vazia preservam hash, sessões e ausência de credenciais no retorno", async () => {
  const f = fixture();
  const write = mock.method(f.repository, "changePassword");
  const attempts = mock.method(f.attempts, "consumeAttempt");
  assert.deepEqual(await f.service.updateProfile(user.id, token, { name: "Maria Teste" }), { ...user, name: "Maria Teste" });
  assert.deepEqual(await f.service.changePassword(user.id, token, blank), { user, changed: false, token: null });
  assert.equal(write.mock.callCount(), 0); assert.equal(attempts.mock.callCount(), 0);
});

test("troca verifica senha atual, grava novo hash e renova token sem expor hashes", async () => {
  const f = fixture(); const write = mock.method(f.repository, "changePassword");
  await assert.rejects(f.service.changePassword(user.id, token, { ...change, currentPassword: "Incorreta1!" }), { status: 400 });
  assert.equal(write.mock.callCount(), 0);
  const result = await f.service.changePassword(user.id, token, change);
  assert.deepEqual(result.user, user); assert.equal(result.changed, true); assert.match(result.token!, /^[a-f0-9]{64}$/);
  const args = write.mock.calls[0].arguments;
  assert.equal(args[1], hashToken(token)); assert.equal(args[2], currentHash);
  assert.equal(await verifyPassword(change.newPassword, args[3]), true);
  assert.equal(args[4].tokenHash, hashToken(result.token!));
  assert.doesNotMatch(JSON.stringify(result.user), /scrypt|passwordHash/);
});

test("limite compartilhado e sessão revogada interrompem alterações sensíveis", async () => {
  const f = fixture(); const write = mock.method(f.repository, "changePassword");
  mock.method(f.attempts, "consumeAttempt", async () => false);
  await assert.rejects(f.service.changePassword(user.id, token, change), { status: 429 });
  await assert.rejects(f.service.requestEmailChange(user.id, token, { email: "novo@example.com", currentPassword }), { status: 429 });
  assert.equal(write.mock.callCount(), 0);
  mock.restoreAll();
  mock.method(f.repository, "credentials", async () => { throw new AuthError(401, "Sessão inválida."); });
  await assert.rejects(f.service.changePassword(user.id, token, change), { status: 401 });
});

test("mudança de e-mail guarda somente hash com validade e só confirma solicitação após envio aceito", async () => {
  const f = fixture(); const issue = mock.method(f.repository, "issueEmailChange"); const send = mock.method(f.mailer, "send");
  await f.service.requestEmailChange(user.id, token, { email: "novo@example.com", currentPassword });
  const args = issue.mock.calls[0].arguments; const confirmation = send.mock.calls[0].arguments[2];
  assert.equal(args[3], "novo@example.com"); assert.equal(args[4].tokenHash, hashToken(confirmation));
  assert.notEqual(args[4].tokenHash, confirmation);
  assert.equal(args[4].expiresAt.getTime(), new Date("2026-11-18T01:00:00Z").getTime() + EMAIL_CHANGE_SECONDS * 1000);
  const consume = mock.method(f.repository, "confirmEmail");
  const result = await f.service.confirmEmail(user.id, token, confirmation);
  assert.equal(result.user.email, "novo@example.com");
  assert.equal(consume.mock.calls[0].arguments[2], hashToken(confirmation));
  assert.equal(consume.mock.calls[0].arguments[3].tokenHash, hashToken(result.token));
});

test("falha de configuração não grava pedido; falha de envio invalida apenas o próprio link e não vaza erros", async () => {
  const f = fixture(); const issue = mock.method(f.repository, "issueEmailChange");
  mock.method(f.mailer, "configuration", () => { throw new AuthError(503, "Indisponível."); });
  await assert.rejects(f.service.requestEmailChange(user.id, token, { email: "novo@example.com", currentPassword }), { status: 503 });
  assert.equal(issue.mock.callCount(), 0);
  mock.restoreAll();
  const send = mock.method(f.mailer, "send", async () => { throw new Error("resposta-privada"); });
  const remove = mock.method(f.repository, "removeEmailChange");
  await assert.rejects(f.service.requestEmailChange(user.id, token, { email: "novo@example.com", currentPassword }), (error: unknown) => {
    assert.ok(error instanceof AuthError); assert.equal(error.status, 503); assert.doesNotMatch(error.message, /resposta-privada/); return true;
  });
  assert.equal(remove.mock.calls[0].arguments[0], hashToken(send.mock.calls[0].arguments[2]!));
});

test("adaptador de e-mail usa endereço canônico e token no fragmento, com erro em rejeição do provedor", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ id: "simulado" }));
  await sendEmailChange(configuration, "novo@example.com", token);
  const [url, options] = calls.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.equal(url, "https://api.resend.com/emails"); assert.equal(options.redirect, "error");
  const body = JSON.parse(options.body as string);
  assert.deepEqual(body.to, ["novo@example.com"]); assert.ok(body.text.includes(`/confirm-email#token=${token}`));
  assert.doesNotMatch(body.text, /simulada/);
  calls.mock.mockImplementation(async () => Response.json({ error: "privado" }, { status: 500 }));
  await assert.rejects(sendEmailChange(configuration, "novo@example.com", token), { status: 503 });
});

const request = (body: unknown, headers = {}, method = "POST") => new Request("http://localhost:3001/api/account/test", {
  method, headers: { "Content-Type": "application/json", Cookie: `${sessionCookieName()}=${token}`, ...headers }, body: JSON.stringify(body),
});
test("rotas exigem sessão e origem antes de alterações e recusam campos extras/JSON inválido", async () => {
  const access = mock.method(authorizationService, "requireUser", async () => { throw new AuthError(401, "Entre na conta."); });
  const save = mock.method(accountService, "updateProfile", async () => user);
  assert.equal((await profile(request({ name: "Maria" }, {}, "PATCH"))).status, 401); assert.equal(save.mock.callCount(), 0);
  access.mock.mockImplementation(async () => user);
  for (const handler of [profile, password, email, confirm]) {
    const response = await handler(request({}, { Origin: "https://invalido.example" }));
    assert.equal(response.status, 403); assert.equal(response.headers.get("cache-control"), "no-store"); assert.match(response.headers.get("vary")!, /Cookie/);
  }
  assert.equal((await profile(request({ name: "Maria", role: "ADMIN" }, {}, "PATCH"))).status, 400);
  assert.equal((await password(request({ ...blank, newPassword: "Nova123!" }))).status, 400);
  assert.equal((await profile(request({ name: "Maria" }, { "Content-Type": "text/plain" }, "PATCH"))).status, 415);
  assert.equal((await profile(request({ name: "a".repeat(9000) }, {}, "PATCH"))).status, 413);
  assert.equal(save.mock.callCount(), 0);
});

test("rotas usam identidade da sessão, renovam cookie só quando necessário e retornam Retry-After", async () => {
  mock.method(authorizationService, "requireUser", async () => user);
  const save = mock.method(accountService, "updateProfile", async () => ({ ...user, name: "Maria" }));
  const response = await profile(request({ name: " Maria " }, {}, "PATCH"));
  assert.equal(response.status, 200); assert.deepEqual(save.mock.calls[0].arguments, [user.id, token, { name: "Maria" }]);
  const changePassword = mock.method(accountService, "changePassword", async () => ({ user, changed: false, token: null }));
  assert.equal((await password(request(blank))).headers.get("set-cookie"), null);
  changePassword.mock.mockImplementation(async () => ({ user, changed: true, token }));
  assert.match((await password(request(change))).headers.get("set-cookie")!, /HttpOnly/);
  mock.method(accountService, "requestEmailChange", async () => {});
  assert.equal((await email(request({ email: "novo@example.com", currentPassword }))).status, 202);
  mock.method(accountService, "confirmEmail", async () => ({ user, token }));
  assert.match((await confirm(request({ token }))).headers.get("set-cookie")!, /HttpOnly/);
  changePassword.mock.mockImplementation(async () => { throw new AuthError(429, "Muitas tentativas."); });
  assert.equal((await password(request(change))).headers.get("retry-after"), "900");
});
