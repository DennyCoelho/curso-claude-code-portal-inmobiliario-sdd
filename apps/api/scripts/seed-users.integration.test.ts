import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import { seedUsers } from "../prisma/seed-users-data";
import { seedTestUsers } from "../prisma/seed-users-database";
import type { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/lib/db/client";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { createAuthRepository } from "../src/repositories/auth-repository";
import { createAuthService } from "../src/services/auth-service";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(async () => { await database.$disconnect(); });
class RollbackTest extends Error {}
async function withRollback(check: (transaction: Prisma.TransactionClient) => Promise<void>) {
  try {
    await database.$transaction(async (transaction) => {
      await transaction.user.deleteMany({ where: { OR: [
        { id: { in: seedUsers.map((user) => user.id) } },
        { email: { in: seedUsers.map((user) => user.email) } },
      ] } });
      await check(transaction);
      throw new RollbackTest();
    }, { timeout: 30_000 });
  } catch (error) {
    if (!(error instanceof RollbackTest)) throw error;
  }
}

test("seed persiste hashes, permite login dos dois perfis, bloqueia o inativo e preserva edições ao repetir", async () => {
  await withRollback(async (transaction) => {
    assert.deepEqual(await seedTestUsers(transaction), { created: 3, preserved: 0, passwordsReset: 0 });
    const service = createAuthService(createAuthRepository(transaction));
    for (const fixture of seedUsers) {
      const stored = await transaction.user.findUniqueOrThrow({ where: { id: fixture.id } });
      assert.equal(stored.role, fixture.role);
      assert.equal(stored.isActive, fixture.isActive);
      assert.notEqual(stored.passwordHash, fixture.password);
      assert.match(stored.passwordHash, /^scrypt\$/);
      if (fixture.isActive) {
        const authenticated = await service.login({ email: fixture.email, password: fixture.password });
        assert.equal(authenticated.user.role, fixture.role);
        await service.logout(authenticated.token);
      } else {
        await assert.rejects(service.login({ email: fixture.email, password: fixture.password }), { status: 401 });
      }
    }
    const edited = await transaction.user.update({ where: { id: seedUsers[0].id }, data: {
      name: "Nome editado localmente", role: "ADMIN", isActive: false,
      passwordHash: await hashPassword("Frase alterada localmente 2026!"),
    } });
    const independent = await transaction.user.create({ data: {
      name: "Conta independente", email: `${randomUUID()}@example.com`, passwordHash: "hash de teste independente",
    } });
    assert.deepEqual(await seedTestUsers(transaction), { created: 0, preserved: 3, passwordsReset: 0 });
    assert.deepEqual(await transaction.user.findUnique({ where: { id: edited.id } }), edited);
    assert.deepEqual(await transaction.user.findUnique({ where: { id: independent.id } }), independent);
    assert.equal(await transaction.session.count({ where: { userId: { in: seedUsers.map((user) => user.id) } } }), 0);
  });
});

test("reset explícito atualiza somente senhas das contas de demonstração e revoga suas sessões", async () => {
  await withRollback(async (transaction) => {
    await seedTestUsers(transaction);
    const edited = await transaction.user.update({ where: { id: seedUsers[0].id }, data: {
      name: "Nome preservado", role: "ADMIN", isActive: false, passwordHash: await hashPassword("SenhaAnterior123"),
    } });
    const independent = await transaction.user.create({ data: {
      name: "Usuário independente", email: `${randomUUID()}@example.com`, passwordHash: "hash independente",
    } });
    await transaction.session.create({ data: { userId: edited.id, tokenHash: "a".repeat(64), expiresAt: new Date(Date.now() + 60_000) } });
    assert.deepEqual(await seedTestUsers(transaction, { resetPasswords: true }), { created: 0, preserved: 0, passwordsReset: 3 });
    const updated = await transaction.user.findUniqueOrThrow({ where: { id: edited.id } });
    assert.equal(updated.name, edited.name);
    assert.equal(updated.role, edited.role);
    assert.equal(updated.isActive, edited.isActive);
    assert.equal(await verifyPassword(seedUsers[0].password, updated.passwordHash), true);
    assert.equal(await verifyPassword("SenhaAnterior123", updated.passwordHash), false);
    assert.deepEqual(await transaction.user.findUnique({ where: { id: independent.id } }), independent);
    assert.equal(await transaction.session.count({ where: { userId: edited.id } }), 0);
  });
});

test("reset recusa IDs de demonstração cujo e-mail tenha sido alterado", async () => {
  await withRollback(async (transaction) => {
    await seedTestUsers(transaction);
    const edited = await transaction.user.update({ where: { id: seedUsers[0].id }, data: { email: `${randomUUID()}@example.com` } });
    await assert.rejects(seedTestUsers(transaction, { resetPasswords: true }), /não corresponde/);
    assert.deepEqual(await transaction.user.findUnique({ where: { id: edited.id } }), edited);
  });
});

test("conflito de e-mail cancela a criação e preserva a conta que já utiliza o endereço", async () => {
  await withRollback(async (transaction) => {
    const independent = await transaction.user.create({ data: {
      name: "Conta preexistente", email: seedUsers[1].email, passwordHash: "hash preservado",
    } });
    await transaction.$executeRawUnsafe("SAVEPOINT seed_usuarios");
    await assert.rejects(seedTestUsers(transaction), { code: "P2002" });
    await transaction.$executeRawUnsafe("ROLLBACK TO SAVEPOINT seed_usuarios");
    assert.deepEqual(await transaction.user.findUnique({ where: { id: independent.id } }), independent);
    assert.equal(await transaction.user.count({ where: { id: { in: seedUsers.map((user) => user.id) } } }), 0);
  });
});
