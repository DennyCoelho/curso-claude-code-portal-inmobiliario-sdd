import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, mock, test } from "node:test";
import nextEnv from "@next/env";
import type { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/lib/db/client";
import { getDatabase } from "../src/lib/db";
import { hashToken, newSession } from "../src/lib/auth/session";
import { verifyPassword } from "../src/lib/auth/password";
import { createAuthRepository } from "../src/repositories/auth-repository";
import { createAccountRepository } from "../src/repositories/account-repository";
import { createPasswordResetRepository } from "../src/repositories/password-reset-repository";
import { createAuthService } from "../src/services/auth-service";
import { createAccountService } from "../src/services/account-service";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(async () => { await Promise.all([database.$disconnect(), getDatabase().$disconnect()]); });
afterEach(() => mock.restoreAll());
class RollbackTest extends Error {}
async function withRollback(work: (client: Prisma.TransactionClient) => Promise<void>) {
  try { await database.$transaction(async (client) => { await work(client); throw new RollbackTest(); }, { timeout: 45_000 }); }
  catch (error) { if (!(error instanceof RollbackTest)) throw error; }
}
const credentials = () => ({ name: "Conta Integração", email: `account-integration-${randomUUID()}@example.com`, password: "Atual123!", confirmPassword: "Atual123!" });
const blank = { currentPassword: "", newPassword: "", confirmPassword: "" };
const change = { currentPassword: "Atual123!", newPassword: "Nova123!", confirmPassword: "Nova123!" };
function emailFixture() {
  const tokens: string[] = [];
  const mailer = { configuration: () => ({ apiKey: "simulada", from: "conta@example.com", origin: "https://portal.example.com" }),
    async send(_config: unknown, _email: string, token: string) { tokens.push(token); } };
  return { tokens, mailer };
}

test("PostgreSQL preserva senha em edição de nome/troca vazia e renova somente a sessão atual na troca", async () => {
  await withRollback(async (client) => {
    const input = credentials(); const authRepository = createAuthRepository(client); const auth = createAuthService(authRepository);
    const accountRepository = createAccountRepository(client); const account = createAccountService(accountRepository, authRepository);
    const first = await auth.register(input); const second = await auth.login(input);
    const original = await client.user.findUniqueOrThrow({ where: { id: first.user.id } });
    await account.updateProfile(first.user.id, first.token, { name: "Nome Atualizado" });
    assert.equal((await account.changePassword(first.user.id, first.token, blank)).changed, false);
    assert.equal((await client.user.findUniqueOrThrow({ where: { id: first.user.id } })).passwordHash, original.passwordHash);
    assert.equal(await client.session.count({ where: { userId: first.user.id } }), 2);
    await assert.rejects(account.changePassword(first.user.id, first.token, { ...change, currentPassword: "Errada123!" }), { status: 400 });
    await assert.rejects(accountRepository.changePassword(first.user.id, hashToken(first.token), "hash-desatualizado", "invalido", newSession(new Date()), () => new Date()), { status: 409 });
    await client.passwordReset.create({ data: { userId: first.user.id, tokenHash: hashToken(randomUUID()), expiresAt: new Date(Date.now() + 60_000) } });
    await client.emailChange.create({ data: { userId: first.user.id, tokenHash: hashToken(randomUUID()), previousEmail: input.email, newEmail: "pendente@example.com", expiresAt: new Date(Date.now() + 60_000) } });
    const changed = await account.changePassword(first.user.id, first.token, change);
    assert.ok(changed.token); assert.equal(changed.user.name, "Nome Atualizado");
    assert.equal(await client.session.count({ where: { userId: first.user.id } }), 1);
    assert.equal(await client.emailChange.count({ where: { userId: first.user.id } }), 0);
    assert.equal(await client.passwordReset.count({ where: { userId: first.user.id } }), 0);
    await assert.rejects(auth.me(first.token), { status: 401 }); await assert.rejects(auth.me(second.token), { status: 401 });
    assert.equal((await auth.me(changed.token)).id, first.user.id);
    await assert.rejects(auth.login(input), { status: 401 });
    const stored = await client.user.findUniqueOrThrow({ where: { id: first.user.id } });
    assert.equal(stored.email, input.email); assert.equal(stored.role, "USER"); assert.equal(stored.isActive, true);
    assert.equal(await verifyPassword(change.newPassword, stored.passwordHash), true);
    await assert.rejects(authRepository.createSession(stored.id, newSession(new Date()), original.passwordHash, input.email), { status: 401 });
    await client.user.update({ where: { id: stored.id }, data: { isActive: false } });
    await assert.rejects(account.updateProfile(stored.id, changed.token, { name: "Bloqueado" }), { status: 401 });
  });
});

test("PostgreSQL confirma e-mail por usuário, substitui links, invalida recuperação e recusa credenciais antigas", async () => {
  await withRollback(async (client) => {
    const input = credentials(); const authRepository = createAuthRepository(client); const auth = createAuthService(authRepository);
    const first = await auth.register(input); const other = await auth.register(credentials());
    const fixture = emailFixture(); const repository = createAccountRepository(client);
    let now = new Date(); const account = createAccountService(repository, authRepository, () => now, fixture.mailer);
    const target = `novo-${randomUUID()}@example.com`;
    await assert.rejects(account.requestEmailChange(first.user.id, first.token, { email: other.user.email, currentPassword: input.password }), { status: 409 });
    await account.requestEmailChange(first.user.id, first.token, { email: target, currentPassword: input.password });
    const pending = await client.emailChange.findUniqueOrThrow({ where: { userId: first.user.id } });
    assert.equal(pending.tokenHash, hashToken(fixture.tokens[0])); assert.equal(pending.newEmail, target);
    assert.equal((await auth.me(first.token)).email, input.email);
    await account.requestEmailChange(first.user.id, first.token, { email: target, currentPassword: input.password });
    await assert.rejects(account.confirmEmail(first.user.id, first.token, fixture.tokens[0]), { status: 400 });
    await assert.rejects(account.confirmEmail(other.user.id, other.token, fixture.tokens[1]), { status: 400 });
    await client.passwordReset.create({ data: { userId: first.user.id, tokenHash: hashToken(randomUUID()), expiresAt: new Date(Date.now() + 60_000) } });
    const previousHash = (await client.user.findUniqueOrThrow({ where: { id: first.user.id } })).passwordHash;
    const confirmed = await account.confirmEmail(first.user.id, first.token, fixture.tokens[1]);
    assert.equal(confirmed.user.email, target); assert.equal((await auth.me(confirmed.token)).id, first.user.id);
    assert.equal(await client.passwordReset.count({ where: { userId: first.user.id } }), 0);
    await assert.rejects(auth.me(first.token), { status: 401 });
    await assert.rejects(authRepository.createSession(first.user.id, newSession(now), previousHash, input.email), { status: 401 });
    await assert.rejects(auth.login(input), { status: 401 });
    await assert.rejects(account.confirmEmail(first.user.id, confirmed.token, fixture.tokens[1]), { status: 400 });
    await account.requestEmailChange(first.user.id, confirmed.token, { email: input.email, currentPassword: input.password });
    now = new Date(now.getTime() + 30 * 60 * 1000);
    await assert.rejects(account.confirmEmail(first.user.id, confirmed.token, fixture.tokens[2]), { status: 400 });
    assert.equal((await client.user.findUniqueOrThrow({ where: { id: first.user.id } })).email, target);
  });
});

test("falha do provedor remove apenas o pedido emitido e recuperação de senha invalida e-mail pendente", async () => {
  await withRollback(async (client) => {
    const input = credentials(); const authRepository = createAuthRepository(client); const auth = createAuthService(authRepository);
    const first = await auth.register(input); const fixture = emailFixture();
    const repository = createAccountRepository(client); const account = createAccountService(repository, authRepository, () => new Date(), fixture.mailer);
    mock.method(fixture.mailer, "send", async () => { throw new Error("simulado"); });
    await assert.rejects(account.requestEmailChange(first.user.id, first.token, { email: `novo-${randomUUID()}@example.com`, currentPassword: input.password }), { status: 503 });
    assert.equal(await client.emailChange.count({ where: { userId: first.user.id } }), 0);
    assert.equal((await auth.me(first.token)).email, input.email);
    const pendingHash = hashToken(randomUUID());
    await client.emailChange.create({ data: { userId: first.user.id, tokenHash: pendingHash, previousEmail: input.email, newEmail: "pendente@example.com", expiresAt: new Date(Date.now() + 60_000) } });
    await repository.removeEmailChange(hashToken(randomUUID()));
    assert.equal(await client.emailChange.count({ where: { tokenHash: pendingHash } }), 1);
    const reset = createPasswordResetRepository(client); const resetHash = hashToken(randomUUID());
    await reset.issue(input.email, { tokenHash: resetHash, expiresAt: new Date(Date.now() + 60_000) });
    assert.equal(await reset.consume(resetHash, "hash-da-recuperacao"), true);
    assert.equal(await client.emailChange.count({ where: { userId: first.user.id } }), 0);
  });
});

test("confirmações concorrentes disputando o mesmo e-mail têm somente um vencedor", async () => {
  const ids: string[] = []; const repository = createAccountRepository(); const target = `disputa-${randomUUID()}@example.com`;
  try {
    const contexts = [];
    for (let index = 0; index < 2; index++) {
      const session = newSession(new Date()); const pending = newSession(new Date());
      const user = await database.user.create({ data: { name: "Concorrência E-mail", email: `account-concurrent-${randomUUID()}@example.com`, passwordHash: "hash-simulado", sessions: { create: { tokenHash: session.tokenHash, expiresAt: session.expiresAt } } } });
      ids.push(user.id);
      await repository.issueEmailChange(user.id, session.tokenHash, user.passwordHash, target, pending, () => new Date());
      contexts.push({ user, session, pending });
    }
    const results = await Promise.allSettled(contexts.map(({ user, session, pending }) => repository.confirmEmail(user.id, session.tokenHash, pending.tokenHash, newSession(new Date()), () => new Date())));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const loser = results.find((result) => result.status === "rejected"); assert.ok(loser && loser.status === "rejected"); assert.equal(loser.reason.status, 409);
    assert.equal(await database.user.count({ where: { email: target } }), 1);
  } finally { await database.user.deleteMany({ where: { id: { in: ids } } }); }
});

test("trocas simultâneas e sessão expirada não permitem gravar com credenciais antigas", async () => {
  const session = newSession(new Date()); const userId = randomUUID(); const repository = createAccountRepository();
  try {
    await database.user.create({ data: { id: userId, name: "Concorrência Senha", email: `account-concurrent-${userId}@example.com`, passwordHash: "anterior", sessions: { create: { tokenHash: session.tokenHash, expiresAt: session.expiresAt } } } });
    const results = await Promise.allSettled(["nova-a", "nova-b"].map((value) => repository.changePassword(userId, session.tokenHash, "anterior", value, newSession(new Date()), () => new Date())));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(await database.session.count({ where: { userId } }), 1);
    const remaining = await database.session.findFirstOrThrow({ where: { userId } });
    await database.session.update({ where: { tokenHash: remaining.tokenHash }, data: { expiresAt: new Date(0) } });
    await assert.rejects(repository.updateName(userId, remaining.tokenHash, "Não deve salvar", () => new Date()), { status: 401 });
    assert.equal((await database.user.findUniqueOrThrow({ where: { id: userId } })).name, "Concorrência Senha");
  } finally { await database.user.deleteMany({ where: { id: userId } }); }
});
