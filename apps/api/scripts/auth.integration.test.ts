import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import type { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/lib/db/client";
import { hashToken } from "../src/lib/auth/session";
import { createAuthRepository } from "../src/repositories/auth-repository";
import { createAuthService } from "../src/services/auth-service";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(async () => { await database.$disconnect(); });
class RollbackTest extends Error {}
async function withRollback(check: (transaction: Prisma.TransactionClient) => Promise<void>) {
  try {
    await database.$transaction(async (transaction) => {
      await check(transaction);
      throw new RollbackTest();
    }, { timeout: 30_000 });
  } catch (error) {
    if (!(error instanceof RollbackTest)) throw error;
  }
}

test("PostgreSQL persiste cadastro/sessão de forma atômica, unicidade e revogação real", async () => {
  await withRollback(async (transaction) => {
    const repository = createAuthRepository(transaction);
    const service = createAuthService(repository);
    const input = { name: "João Teste", email: `auth-${randomUUID()}@example.com`, password: "Teste123!", confirmPassword: "Teste123!" };
    const registered = await service.register(input);
    const stored = await transaction.user.findUniqueOrThrow({ where: { id: registered.user.id } });
    assert.equal(stored.role, "USER");
    assert.equal(stored.isActive, true);
    assert.notEqual(stored.passwordHash, input.password);
    assert.match(stored.passwordHash, /^scrypt\$/);
    assert.equal(await transaction.session.count({ where: { tokenHash: registered.token } }), 0);
    assert.equal(await transaction.session.count({ where: { tokenHash: hashToken(registered.token) } }), 1);
    assert.deepEqual(await service.me(registered.token), registered.user);
    await transaction.$executeRawUnsafe("SAVEPOINT cadastro_duplicado");
    await assert.rejects(service.register(input), { status: 409 });
    await transaction.$executeRawUnsafe("ROLLBACK TO SAVEPOINT cadastro_duplicado");
    const logged = await service.login({ email: input.email, password: input.password }, registered.token);
    await assert.rejects(service.me(registered.token), { status: 401 });
    await service.logout(logged.token);
    await service.logout(logged.token);
    assert.equal(await transaction.session.count({ where: { userId: stored.id } }), 0);
  });
});

test("sessões refletem expiração, inatividade, perfil atual e exclusão do usuário", async () => {
  await withRollback(async (transaction) => {
    const service = createAuthService(createAuthRepository(transaction));
    const input = { name: "Maria Teste", email: `auth-${randomUUID()}@example.com`, password: "OutroTeste456!", confirmPassword: "OutroTeste456!" };
    const registered = await service.register(input);
    const id = registered.user.id;
    await transaction.user.update({ where: { id }, data: { role: "ADMIN" } });
    assert.equal((await service.me(registered.token)).role, "ADMIN");
    await transaction.user.update({ where: { id }, data: { isActive: false } });
    await assert.rejects(service.login(input), { status: 401, message: "E-mail ou senha inválidos." });
    await assert.rejects(service.me(registered.token), { status: 401 });
    await transaction.user.update({ where: { id }, data: { isActive: true } });
    const logged = await service.login(input);
    await transaction.session.update({ where: { tokenHash: hashToken(logged.token) }, data: { expiresAt: new Date(0) } });
    await assert.rejects(service.me(logged.token), { status: 401 });
    const last = await service.login(input);
    await transaction.user.delete({ where: { id } });
    assert.equal(await transaction.session.count({ where: { userId: id } }), 0);
    await assert.rejects(service.me(last.token), { status: 401 });
  });
});

test("limite no PostgreSQL soma tentativas concorrentes e reabre após quinze minutos", async () => {
  const key = hashToken(randomUUID());
  try {
    const repository = createAuthRepository(database);
    const now = new Date();
    const attempts = await Promise.all(Array.from({ length: 14 }, () => repository.consumeAttempt(key, now)));
    assert.equal(attempts.filter(Boolean).length, 10);
    const row = await database.authRateLimit.findUniqueOrThrow({ where: { key } });
    assert.equal(row.attempts, 11);
    assert.equal(await repository.consumeAttempt(key, new Date(now.getTime() + 15 * 60 * 1000)), true);
    assert.equal((await database.authRateLimit.findUniqueOrThrow({ where: { key } })).attempts, 1);
  } finally {
    await database.authRateLimit.deleteMany({ where: { key } });
  }
});
