import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import { createDatabaseClient } from "../src/lib/db/client";
import { hashToken } from "../src/lib/auth/session";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(async () => { await database.$disconnect(); });

for (const origin of [process.env.AUTH_TEST_API_URL ?? "http://localhost:3001", process.env.WEB_URL ?? "http://localhost:3000"]) {
  test(`recuperação HTTP em ${origin}: link descartável, uso único e revogação das sessões`, async () => {
    const id = randomUUID();
    const email = `recovery-http-${id}@example.com`;
    const token = randomBytes(32).toString("hex");
    const sessionTokens = [randomBytes(32).toString("hex"), randomBytes(32).toString("hex")];
    const input = { token, password: "Nova123!", confirmPassword: "Nova123!" };
    const post = (action: string, body: unknown, source = origin) => fetch(new URL(`/api/auth/${action}`, origin), {
      method: "POST", headers: { "Content-Type": "application/json", Origin: source, Cookie: `portal_session=${sessionTokens[0]}` },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
    try {
      // O envio por e-mail não é invocado: somente o link desta conta descartável é criado no banco.
      await database.user.create({ data: { id, name: "Teste Recuperação HTTP", email, passwordHash: "anterior" } });
      await database.passwordReset.create({ data: { tokenHash: hashToken(token), userId: id, expiresAt: new Date(Date.now() + 60_000) } });
      await database.session.createMany({ data: sessionTokens.map((sessionToken) => ({ tokenHash: hashToken(sessionToken), userId: id, expiresAt: new Date(Date.now() + 60_000) })) });
      assert.equal((await post("forgot-password", { email: "inválido" })).status, 400);
      assert.equal((await post("reset-password", input, "https://invasor.example.com")).status, 403);
      assert.equal((await post("reset-password", { ...input, confirmPassword: "Outra123!" })).status, 400);
      assert.equal(await database.session.count({ where: { userId: id } }), 2);
      const changed = await post("reset-password", input);
      assert.equal(changed.status, 200);
      assert.equal(changed.headers.get("cache-control"), "no-store");
      assert.match(changed.headers.get("set-cookie")!, /Max-Age=0/);
      assert.doesNotMatch(JSON.stringify(await changed.json()), /token|passwordHash/);
      assert.equal(await database.session.count({ where: { userId: id } }), 0);
      assert.equal(await database.passwordReset.count({ where: { userId: id } }), 0);
      assert.equal((await post("reset-password", input)).status, 400);
      assert.equal((await post("login", { email, password: "anterior" })).status, 401);
      assert.equal((await post("login", { email, password: input.password })).status, 200);
      await database.passwordReset.create({ data: { tokenHash: hashToken(token), userId: id, expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await post("reset-password", input)).status, 400);
    } finally {
      await database.user.deleteMany({ where: { id } });
      await database.authRateLimit.deleteMany({ where: { key: { in: [hashToken(`login:${email}`), hashToken(`reset-password:${token}`)] } } });
    }
  });
}
