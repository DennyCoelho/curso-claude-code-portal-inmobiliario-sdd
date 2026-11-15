import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { registerSchema } from "@portal-inmobiliario/contracts/auth";
import { seedUsers } from "../prisma/seed-users-data";

test("contas de demonstração cobrem USER/ADMIN ativos e USER inativo com credenciais válidas", () => {
  assert.equal(new Set(seedUsers.map((user) => user.id)).size, seedUsers.length);
  assert.equal(new Set(seedUsers.map((user) => user.email)).size, seedUsers.length);
  for (const { id, name, email, password } of seedUsers) {
    assert.match(id, /^[a-f0-9-]{36}$/);
    assert.match(email, /@exemplo\.test$/);
    const input = { name, email, password, confirmPassword: password };
    assert.deepEqual(registerSchema.parse(input), input);
  }
  assert.ok(seedUsers.some((user) => user.role === "USER" && user.isActive));
  assert.ok(seedUsers.some((user) => user.role === "ADMIN" && user.isActive));
  assert.ok(seedUsers.some((user) => user.role === "USER" && !user.isActive));
});

test("seed de usuários recusa produção antes de abrir conexão", () => {
  const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "prisma/seed-users.ts"], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "postgresql://invalido" },
    encoding: "utf8", timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /não pode ser executado em produção/);
  assert.doesNotMatch(result.stderr, /DATABASE_URL|PrismaClient/);
});
