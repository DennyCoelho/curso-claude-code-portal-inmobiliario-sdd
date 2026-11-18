import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import { authResponseSchema } from "@portal-inmobiliario/contracts/auth";
import { passwordChangeResponseSchema } from "@portal-inmobiliario/contracts/account";
import { createDatabaseClient } from "../src/lib/db/client";
import { hashPassword } from "../src/lib/auth/password";
import { hashToken, newSession } from "../src/lib/auth/session";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(async () => { await database.$disconnect(); });
const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
const origins = [process.env.AUTH_TEST_API_URL ?? "http://localhost:3001", webUrl];
const passwordHash = await hashPassword("Atual123!");
for (const origin of origins) test(`perfil e segurança HTTP em ${origin}, sem envio de e-mails reais`, async () => {
  const ids: string[] = [];
  const call = (path: string, method = "GET", body?: unknown, cookie = "", source = origin) => fetch(new URL(path, origin), {
    method, headers: { "Content-Type": "application/json", Cookie: cookie, Origin: source, "x-user-id": "identidade-falsificada", "x-user-role": "ADMIN" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15_000),
  });
  try {
    const absent = await call("/api/auth/me"); const cookieName = absent.headers.get("set-cookie")!.split("=")[0];
    const sessions = [newSession(new Date()), newSession(new Date())];
    const user = await database.user.create({ data: { name: "Conta HTTP", email: `account-http-${randomUUID()}@example.com`, passwordHash,
      sessions: { create: sessions.map(({ tokenHash, expiresAt }) => ({ tokenHash, expiresAt })) } } });
    ids.push(user.id);
    let cookie = `${cookieName}=${sessions[0].token}`;
    for (const [path, method] of [["profile", "PATCH"], ["password", "POST"], ["email-change", "POST"], ["email-change/confirm", "POST"]]) {
      const response = await call(`/api/account/${path}`, method, {}); assert.equal(response.status, 401);
    }
    assert.equal((await call("/api/account/profile", "PATCH", { name: "Falso", role: "ADMIN" }, cookie)).status, 400);
    assert.equal((await call("/api/account/profile", "PATCH", { name: "Falso" }, cookie, "https://invalido.example")).status, 403);
    const renamed = await call("/api/account/profile", "PATCH", { name: " Maria Conta HTTP " }, cookie);
    assert.equal(renamed.status, 200); assert.equal(renamed.headers.get("cache-control"), "no-store"); assert.match(renamed.headers.get("vary")!, /Cookie/);
    assert.deepEqual(authResponseSchema.parse(await renamed.json()).user, { id: user.id, name: "Maria Conta HTTP", email: user.email, role: "USER" });
    const page = await fetch(new URL("/account", webUrl), { headers: { Cookie: cookie }, signal: AbortSignal.timeout(15_000) });
    const html = await page.text(); assert.match(html, /Maria Conta HTTP/); assert.match(html, /aria-label="Editar nome"/); assert.match(html, /aria-label="Alterar senha"/);
    const blank = { currentPassword: "", newPassword: "", confirmPassword: "" };
    const unchanged = await call("/api/account/password", "POST", blank, cookie);
    assert.equal(unchanged.status, 200); assert.equal(passwordChangeResponseSchema.parse(await unchanged.json()).changed, false); assert.equal(unchanged.headers.get("set-cookie"), null);
    assert.equal((await database.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash, passwordHash);
    assert.equal(await database.session.count({ where: { userId: user.id } }), 2);
    assert.equal((await call("/api/account/password", "POST", { ...blank, newPassword: "Nova123!" }, cookie)).status, 400);
    const change = { currentPassword: "Errada123!", newPassword: "Nova123!", confirmPassword: "Nova123!" };
    assert.equal((await call("/api/account/password", "POST", change, cookie)).status, 400);
    assert.equal((await call("/api/auth/me", "GET", undefined, cookie)).status, 200);
    const updated = await call("/api/account/password", "POST", { ...change, currentPassword: "Atual123!" }, cookie);
    assert.equal(updated.status, 200); assert.equal(passwordChangeResponseSchema.parse(await updated.json()).changed, true);
    assert.match(updated.headers.get("set-cookie")!, /HttpOnly/); cookie = updated.headers.get("set-cookie")!.split(";")[0];
    assert.equal(await database.session.count({ where: { userId: user.id } }), 1);
    for (const session of sessions) assert.equal((await call("/api/auth/me", "GET", undefined, `${cookieName}=${session.token}`)).status, 401);
    const target = `novo-account-http-${randomUUID()}@example.com`;
    assert.equal((await call("/api/account/email-change", "POST", { email: target, currentPassword: "Atual123!" }, cookie)).status, 400);
    if (!process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL_FROM || !process.env.WEB_URL) {
      assert.equal((await call("/api/account/email-change", "POST", { email: target, currentPassword: "Nova123!" }, cookie)).status, 503);
      assert.equal(await database.emailChange.count({ where: { userId: user.id } }), 0);
    }
    // O pedido é preparado no banco somente neste teste; o provedor é simulado nos testes de serviço.
    const confirmation = newSession(new Date());
    await database.emailChange.create({ data: { userId: user.id, tokenHash: confirmation.tokenHash, previousEmail: user.email, newEmail: target, expiresAt: new Date(0) } });
    assert.equal((await call("/api/account/email-change/confirm", "POST", { token: confirmation.token }, cookie)).status, 400);
    await database.emailChange.update({ where: { tokenHash: confirmation.tokenHash }, data: { expiresAt: new Date(Date.now() + 60_000) } });
    const confirmed = await call("/api/account/email-change/confirm", "POST", { token: confirmation.token }, cookie);
    assert.equal(confirmed.status, 200); assert.equal(authResponseSchema.parse(await confirmed.json()).user.email, target);
    const oldCookie = cookie; cookie = confirmed.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await call("/api/auth/me", "GET", undefined, oldCookie)).status, 401);
    assert.equal((await call("/api/auth/me", "GET", undefined, cookie)).status, 200);
    assert.equal((await call("/api/account/email-change/confirm", "POST", { token: confirmation.token }, cookie)).status, 400);
    assert.equal(await database.emailChange.count({ where: { userId: user.id } }), 0);
    const confirmationPage = await fetch(new URL("/confirm-email", webUrl), { signal: AbortSignal.timeout(15_000) });
    const confirmationHtml = await confirmationPage.text(); assert.match(confirmationHtml, /name="robots" content="noindex, nofollow"/); assert.match(confirmationHtml, /name="referrer" content="no-referrer"/);
    assert.doesNotMatch(confirmationHtml, new RegExp(confirmation.token + "|" + passwordHash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    await database.user.deleteMany({ where: { id: { in: ids } } });
    await database.authRateLimit.deleteMany({ where: { key: { in: ids.map((id) => hashToken(`account-sensitive:${id}`)) } } });
  }
});
