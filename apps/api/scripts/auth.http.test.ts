import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import { authResponseSchema } from "@portal-inmobiliario/contracts/auth";
import { createDatabaseClient } from "../src/lib/db/client";
import { hashToken } from "../src/lib/auth/session";

// Este teste cria contas descartáveis por HTTP e remove somente seus próprios IDs.
nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(async () => { await database.$disconnect(); });
const origins = [process.env.AUTH_TEST_API_URL ?? "http://localhost:3001", process.env.WEB_URL ?? "http://localhost:3000"];

for (const origin of origins) {
  test(`autenticação HTTP completa em ${origin}, com limpeza dos dados de teste`, async () => {
    const password = `Teste${randomUUID().replaceAll("-", "").slice(0, 8)}1!`;
    const input = { name: "João Teste HTTP", email: `auth-http-${randomUUID()}@example.com`, password, confirmPassword: password };
    const ids: string[] = [];
    const call = (path: string, options: RequestInit = {}) => fetch(new URL(`/api/auth/${path}`, origin), { ...options, signal: AbortSignal.timeout(15_000) });
    const post = (path: string, body?: unknown, cookie?: string, source = origin) => call(path, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: source, ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const credentials = { email: input.email, password: input.password };
    try {
      assert.equal((await call("me")).status, 401);
      assert.equal((await post("register", { ...input, role: "ADMIN" })).status, 400);
      for (const invalidPassword of ["Ab1234!", "A12345678901234!", "teste12!", "TESTEAB!", "Teste123", " Teste12 "]) {
        assert.equal((await post("register", { ...input, password: invalidPassword, confirmPassword: invalidPassword })).status, 400);
      }
      assert.equal((await post("register", { ...input, confirmPassword: "Outra123" })).status, 400);
      const { confirmPassword: omitted, ...withoutConfirmation } = input;
      assert.ok(omitted);
      assert.equal((await post("register", withoutConfirmation)).status, 400);
      assert.equal((await post("register", input, undefined, "https://origem-invalida.example")).status, 403);
      const registered = await post("register", { ...input, email: input.email.toUpperCase() });
      assert.equal(registered.status, 201);
      const data = authResponseSchema.parse(await registered.json());
      ids.push(data.user.id);
      assert.equal(data.user.role, "USER");
      assert.equal(data.user.email, input.email);
      const firstSetCookie = registered.headers.get("set-cookie")!;
      assert.match(firstSetCookie, /HttpOnly/);
      assert.match(firstSetCookie, /SameSite=Lax/);
      const firstCookie = firstSetCookie.split(";")[0];
      const stored = await database.user.findUniqueOrThrow({ where: { id: data.user.id } });
      assert.match(stored.passwordHash, /^scrypt\$/);
      const token = firstCookie.split("=")[1];
      assert.equal(await database.session.count({ where: { userId: data.user.id, tokenHash: hashToken(token) } }), 1);
      const current = await call("me", { headers: { Cookie: firstCookie } });
      assert.equal(current.status, 200);
      assert.deepEqual(await current.json(), data);
      assert.equal(current.headers.get("cache-control"), "no-store");
      assert.equal((await post("register", input)).status, 409);
      const wrong = await post("login", { ...credentials, password: "Uma senha incorreta longa" });
      assert.equal(wrong.status, 401);
      assert.equal(wrong.headers.get("set-cookie"), null);
      const logged = await post("login", credentials, firstCookie);
      assert.equal(logged.status, 200);
      const nextCookie = logged.headers.get("set-cookie")!.split(";")[0];
      assert.notEqual(nextCookie, firstCookie);
      assert.equal((await call("me", { headers: { Cookie: firstCookie } })).status, 401);
      await database.user.update({ where: { id: data.user.id }, data: { isActive: false } });
      assert.equal((await post("login", credentials)).status, 401);
      assert.equal((await call("me", { headers: { Cookie: nextCookie } })).status, 401);
      await database.user.update({ where: { id: data.user.id }, data: { isActive: true } });
      const renewed = await post("login", credentials);
      assert.equal(renewed.status, 200);
      const renewedCookie = renewed.headers.get("set-cookie")!.split(";")[0];
      const ended = await post("logout", undefined, renewedCookie);
      assert.equal(ended.status, 204);
      assert.match(ended.headers.get("set-cookie")!, /Max-Age=0/);
      assert.equal((await call("me", { headers: { Cookie: renewedCookie } })).status, 401);
      assert.equal((await post("logout")).status, 204);
      assert.equal(await database.session.count({ where: { userId: data.user.id } }), 0);
    } finally {
      // Buscar também pelo e-mail único para limpar mesmo se a validação da resposta falhar.
      await database.user.deleteMany({ where: { OR: [{ id: { in: ids } }, { email: input.email }] } });
      await database.authRateLimit.deleteMany({ where: { key: { in: [hashToken(`register:${input.email}`), hashToken(`login:${input.email}`)] } } });
    }
  });
}
