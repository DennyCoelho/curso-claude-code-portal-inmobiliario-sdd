import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import { authResponseSchema } from "@portal-inmobiliario/contracts/auth";
import { createDatabaseClient } from "../src/lib/db/client";
import { newSession } from "../src/lib/auth/session";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(async () => { await database.$disconnect(); });
const apiUrl = process.env.AUTH_TEST_API_URL ?? "http://localhost:3001";
const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
const call = (origin: string, path: string, cookie = "") => fetch(new URL(path, origin), {
  headers: { Cookie: cookie, "x-user-role": "ADMIN", "x-user-id": "identidade-falsificada" },
  redirect: "manual", signal: AbortSignal.timeout(15_000),
});

async function expectPageRedirect(path: string, target: string, cookie = "") {
  const response = await call(webUrl, path, cookie);
  const html = await response.text();
  assert.doesNotMatch(html, /Seu acesso à área (?:privada|administrativa) está confirmado/);
  assert.doesNotMatch(html, /Informações da conta|id="account-favorites-title"|id="account-inquiries-title"|id="admin-indicators-title"/);
  if (response.status === 307) {
    assert.equal(new URL(response.headers.get("location")!, webUrl).pathname + new URL(response.headers.get("location")!, webUrl).search, target);
  } else {
    // O fallback geral pode iniciar streaming antes da decisão do Server Component.
    assert.equal(response.status, 200);
    assert.match(html, /__next-page-redirect/);
    assert.ok(html.includes(target));
  }
}

test("autorização HTTP direta/proxy e páginas privadas respeitam sessão/perfil atual sem alterar contas existentes", async () => {
  const ids: string[] = [];
  const accounts: { name: string; email: string; role: "USER" | "ADMIN" }[] = [];
  try {
    const absent = await call(apiUrl, "/api/admin/session");
    assert.equal(absent.status, 401);
    const cookieName = absent.headers.get("set-cookie")!.split("=")[0];
    const sessions = { USER: newSession(new Date()), ADMIN: newSession(new Date()) };
    const cookies = { USER: `${cookieName}=${sessions.USER.token}`, ADMIN: `${cookieName}=${sessions.ADMIN.token}` };
    for (const role of ["USER", "ADMIN"] as const) {
      const user = await database.user.create({ data: {
        name: `Autorização HTTP ${role}`, email: `authorization-http-${randomUUID()}@example.com`, passwordHash: "hash-exclusivo-do-teste", role,
        sessions: { create: { tokenHash: sessions[role].tokenHash, expiresAt: sessions[role].expiresAt } },
      } });
      ids.push(user.id);
      accounts.push({ name: user.name, email: user.email, role });
    }
    for (const origin of [apiUrl, webUrl]) {
      for (const [cookie, status] of [["", 401], [`${cookieName}=ADMIN`, 401], [`${cookies.ADMIN}; ${cookies.ADMIN}`, 401], [cookies.USER, 403], [cookies.ADMIN, 200]] as const) {
        const response = await call(origin, "/api/admin/session", cookie);
        assert.equal(response.status, status);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.match(response.headers.get("vary")!, /Cookie/i);
        if (status === 200) assert.equal(authResponseSchema.parse(await response.json()).user.role, "ADMIN");
        if (status === 403) assert.equal(response.headers.get("set-cookie"), null);
        if (status === 401) assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
      }
      for (const role of ["USER", "ADMIN"] as const) {
        assert.equal((await call(origin, "/api/auth/me", cookies[role])).status, 200);
      }
      assert.equal((await fetch(new URL("/api/admin/session", origin), { method: "POST", signal: AbortSignal.timeout(15_000) })).status, 405);
    }
    await expectPageRedirect("/account", "/login?next=%2Faccount");
    await expectPageRedirect("/admin", "/login?next=%2Fadmin");
    await expectPageRedirect("/admin", "/access-denied", cookies.USER);
    for (const account of accounts) {
      // Repetir o acesso confirma a identidade após recarga e alternância de usuário.
      for (let visit = 0; visit < 2; visit++) {
        const response = await call(webUrl, "/account", cookies[account.role]);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("cache-control")!, /no-store|private/);
        const html = await response.text();
        assert.ok(html.includes(account.name));
        assert.ok(html.includes(account.email));
        assert.ok(!html.includes(accounts.find((other) => other.role !== account.role)!.email));
        assert.match(html, /Informações da conta/);
        assert.match(html, /Imóveis de interesse/);
        assert.match(html, /Consultas enviadas/);
        assert.match(html, /Consultas enviadas/);
        assert.ok(html.includes(account.role === "ADMIN" ? "Administrador" : "Usuário"));
        assert.match(html, /name="robots" content="noindex, nofollow"/);
        assert.doesNotMatch(html, new RegExp(sessions.USER.token + "|" + sessions.ADMIN.token + "|hash-exclusivo-do-teste"));
      }
    }
    const adminPage = await call(webUrl, "/admin", cookies.ADMIN);
    assert.equal(adminPage.status, 200);
    assert.match(await adminPage.text(), /id="admin-indicators-title"/);
    await database.user.update({ where: { id: ids[1] }, data: { role: "USER" } });
    for (const origin of [apiUrl, webUrl]) assert.equal((await call(origin, "/api/admin/session", cookies.ADMIN)).status, 403);
    await expectPageRedirect("/admin", "/access-denied", cookies.ADMIN);
    await database.user.update({ where: { id: ids[0] }, data: { role: "ADMIN" } });
    for (const origin of [apiUrl, webUrl]) assert.equal((await call(origin, "/api/admin/session", cookies.USER)).status, 200);
    await database.user.update({ where: { id: ids[0] }, data: { isActive: false } });
    for (const origin of [apiUrl, webUrl]) assert.equal((await call(origin, "/api/admin/session", cookies.USER)).status, 401);
    await expectPageRedirect("/account", "/login?next=%2Faccount", cookies.USER);
    await database.session.update({ where: { tokenHash: sessions.ADMIN.tokenHash }, data: { expiresAt: new Date(0) } });
    assert.equal((await call(webUrl, "/api/auth/me", cookies.ADMIN)).status, 401);
    await expectPageRedirect("/account", "/login?next=%2Faccount", cookies.ADMIN);
    await expectPageRedirect("/admin", "/login?next=%2Fadmin", cookies.ADMIN);
    const denied = await call(webUrl, "/access-denied");
    assert.equal(denied.status, 200);
    assert.match(await denied.text(), /Você não tem permissão para acessar a área administrativa/);
  } finally {
    await database.user.deleteMany({ where: { id: { in: ids } } });
  }
});
