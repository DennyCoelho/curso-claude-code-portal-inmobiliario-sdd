import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import type { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/lib/db/client";
import { hashToken } from "../src/lib/auth/session";
import { verifyPassword } from "../src/lib/auth/password";
import { createAuthRepository } from "../src/repositories/auth-repository";
import { createPasswordResetRepository } from "../src/repositories/password-reset-repository";
import { createAuthService } from "../src/services/auth-service";
import { createPasswordResetService, RESET_SECONDS } from "../src/services/password-reset-service";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(async () => { await database.$disconnect(); });
class RollbackTest extends Error {}
async function withRollback(check: (transaction: Prisma.TransactionClient) => Promise<void>) {
  try {
    await database.$transaction(async (transaction) => { await check(transaction); throw new RollbackTest(); }, { timeout: 30_000 });
  } catch (error) { if (!(error instanceof RollbackTest)) throw error; }
}

test("PostgreSQL recupera senha, substitui links, revoga todas as sessões e exige novo login", async () => {
  await withRollback(async (transaction) => {
    const authRepository = createAuthRepository(transaction);
    const auth = createAuthService(authRepository);
    let now = new Date();
    const tokens: string[] = [];
    const tasks: (() => Promise<void>)[] = [];
    const recovery = createPasswordResetService(createPasswordResetRepository(transaction), authRepository, () => now, {
      configuration: () => ({ apiKey: "simulada", from: "conta@example.com", origin: "https://portal.example.com" }),
      async send(_configuration, _email, token) { tokens.push(token); },
    });
    const input = { name: "Teste Recuperação", email: `recovery-${randomUUID()}@example.com`, password: "Antiga123!", confirmPassword: "Antiga123!" };
    const registered = await auth.register(input);
    const previousPasswordHash = (await authRepository.findByEmail(input.email))!.passwordHash;
    const secondSession = await auth.login({ email: input.email, password: input.password });
    await recovery.request({ email: input.email }, (task) => { tasks.push(task); }); await tasks[0]();
    const first = await transaction.passwordReset.findUniqueOrThrow({ where: { userId: registered.user.id } });
    assert.equal(first.tokenHash, hashToken(tokens[0])); assert.notEqual(first.tokenHash, tokens[0]);
    assert.equal(await transaction.session.count({ where: { userId: registered.user.id } }), 2);
    await recovery.request({ email: input.email }, (task) => { tasks.push(task); }); await tasks[1]();
    const change = { token: tokens[0], password: "Nova123!", confirmPassword: "Nova123!" };
    await assert.rejects(recovery.reset(change), { status: 400 });
    await recovery.reset({ ...change, token: tokens[1] });
    await assert.rejects(authRepository.createSession(registered.user.id, { tokenHash: "c".repeat(64), expiresAt: new Date(Date.now() + 60_000) }, previousPasswordHash), { status: 401 });
    assert.equal(await transaction.passwordReset.count({ where: { userId: registered.user.id } }), 0);
    await assert.rejects(auth.me(registered.token), { status: 401 });
    await assert.rejects(auth.me(secondSession.token), { status: 401 });
    await assert.rejects(auth.login({ email: input.email, password: input.password }), { status: 401 });
    const stored = await transaction.user.findUniqueOrThrow({ where: { id: registered.user.id } });
    assert.equal(await verifyPassword("Nova123!", stored.passwordHash), true);
    assert.equal(stored.role, "USER"); assert.equal(stored.isActive, true);
    const logged = await auth.login({ email: input.email, password: "Nova123!" });
    assert.equal((await auth.me(logged.token)).id, stored.id);
    await assert.rejects(recovery.reset({ ...change, token: tokens[1] }), { status: 400 });
    await recovery.request({ email: input.email }, (task) => { tasks.push(task); }); await tasks[2]();
    now = new Date(now.getTime() + RESET_SECONDS * 1000);
    await assert.rejects(recovery.reset({ ...change, token: tokens[2] }), { status: 400 });
    await transaction.user.update({ where: { id: stored.id }, data: { isActive: false } });
    await recovery.request({ email: input.email }, (task) => { tasks.push(task); });
    assert.equal(tasks.length, 3);
    await transaction.user.delete({ where: { id: stored.id } });
    assert.equal(await transaction.passwordReset.count({ where: { userId: stored.id } }), 0);
  });
});

test("PostgreSQL permite apenas um consumo concorrente e preserva senha/sessões após repetição", async () => {
  const userId = randomUUID();
  const repository = createPasswordResetRepository();
  const tokenHash = hashToken(randomBytes(32).toString("hex"));
  try {
    await database.user.create({ data: { id: userId, name: "Concorrência Recuperação", email: `recovery-${userId}@example.com`, passwordHash: "anterior" } });
    await repository.issue(`recovery-${userId}@example.com`, { tokenHash, expiresAt: new Date(Date.now() + 60_000) });
    const results = await Promise.all([repository.consume(tokenHash, "nova-a"), repository.consume(tokenHash, "nova-b")]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await database.passwordReset.count({ where: { userId } }), 0);
    const stored = await database.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(stored.passwordHash, results[0] ? "nova-a" : "nova-b");
    await database.session.create({ data: { userId, tokenHash: "b".repeat(64), expiresAt: new Date(Date.now() + 60_000) } });
    assert.equal(await repository.consume(tokenHash, "adulterada"), false);
    assert.equal(await database.session.count({ where: { userId } }), 1);
    assert.equal((await database.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash, stored.passwordHash);
  } finally { await database.user.deleteMany({ where: { id: userId } }); }
});
