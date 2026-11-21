import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import { adminDashboardSchema } from "@portal-inmobiliario/contracts/admin-dashboard";
import { createDatabaseClient } from "../src/lib/db/client";
import { newSession } from "../src/lib/auth/session";
import { createAdminDashboardRepository } from "../src/repositories/admin-dashboard-repository";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(() => database.$disconnect());
const apiUrl = process.env.AUTH_TEST_API_URL ?? "http://localhost:3001";
const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
const call = (origin: string, path: string, cookie = "") => fetch(new URL(path, origin), {
  headers: { Cookie: cookie, "x-user-role": "ADMIN" }, redirect: "manual", signal: AbortSignal.timeout(15_000),
});
async function expectBlockedPage(cookie: string, destination: string) {
  const response = await call(webUrl, "/admin", cookie);
  const html = await response.text();
  assert.doesNotMatch(html, /id="admin-indicators-title"|<dt>Total de imóveis/);
  if (response.status === 307) assert.equal(response.headers.get("location"), destination);
  else { assert.equal(response.status, 200); assert.match(html, /__next-page-redirect/); assert.ok(html.includes(destination)); }
}

test("painel HTTP direto/proxy reflete PostgreSQL e bloqueia visitantes, USER, rebaixamento, inativação e revogação", async () => {
  const ids: string[] = [];
  try {
    const absent = await call(apiUrl, "/api/admin/dashboard");
    assert.equal(absent.status, 401);
    const cookieName = absent.headers.get("set-cookie")!.split("=")[0];
    const sessions = { USER: newSession(new Date()), ADMIN: newSession(new Date()) };
    const cookies = { USER: `${cookieName}=${sessions.USER.token}`, ADMIN: `${cookieName}=${sessions.ADMIN.token}` };
    for (const role of ["USER", "ADMIN"] as const) {
      const user = await database.user.create({ data: { name: "Painel HTTP Teste", email: `dashboard-${randomUUID()}@exemplo.test`,
        passwordHash: "hash-privado-do-teste", role, sessions: { create: { tokenHash: sessions[role].tokenHash, expiresAt: sessions[role].expiresAt } } } });
      ids.push(user.id);
    }
    const expected = await createAdminDashboardRepository(database).getCounts();
    for (const origin of [apiUrl, webUrl]) {
      for (const [cookie, status] of [["", 401], [`${cookieName}=ADMIN`, 401], [`${cookies.ADMIN}; ${cookies.ADMIN}`, 401], [cookies.USER, 403], [cookies.ADMIN, 200]] as const) {
        const response = await call(origin, "/api/admin/dashboard?role=ADMIN", cookie);
        assert.equal(response.status, status);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.match(response.headers.get("vary")!, /Cookie/i);
        if (status === 200) assert.deepEqual(adminDashboardSchema.parse(await response.json()), expected);
        else assert.doesNotMatch(await response.text(), /totalProperties|totalUsers|totalInquiries/);
      }
      assert.equal((await fetch(new URL("/api/admin/dashboard", origin), { method: "POST", signal: AbortSignal.timeout(15_000) })).status, 405);
    }
    await expectBlockedPage("", "/login?next=%2Fadmin");
    await expectBlockedPage(cookies.USER, "/access-denied");
    for (let access = 0; access < 2; access++) {
      const response = await call(webUrl, "/admin", cookies.ADMIN);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control")!, /no-store|private/);
      const html = await response.text();
      assert.match(html, /id="admin-indicators-title"/);
      assert.match(html, /name="robots" content="noindex, nofollow"/);
      assert.doesNotMatch(html, new RegExp(`${sessions.ADMIN.token}|hash-privado-do-teste|dashboard-.*@exemplo.test`));
    }
    for (const data of [{ role: "USER" as const }, { role: "ADMIN" as const, isActive: false }]) {
      await database.user.update({ where: { id: ids[1] }, data });
      const expectedStatus = data.isActive === false ? 401 : 403;
      for (const origin of [apiUrl, webUrl]) assert.equal((await call(origin, "/api/admin/dashboard", cookies.ADMIN)).status, expectedStatus);
      await expectBlockedPage(cookies.ADMIN, expectedStatus === 401 ? "/login?next=%2Fadmin" : "/access-denied");
    }
    await database.user.update({ where: { id: ids[1] }, data: { role: "ADMIN", isActive: true } });
    await database.session.create({ data: { tokenHash: sessions.ADMIN.tokenHash, userId: ids[1], expiresAt: sessions.ADMIN.expiresAt } });
    assert.equal((await call(webUrl, "/api/admin/dashboard", cookies.ADMIN)).status, 200);
    await database.session.delete({ where: { tokenHash: sessions.ADMIN.tokenHash } });
    assert.equal((await call(webUrl, "/api/admin/dashboard", cookies.ADMIN)).status, 401);
    await expectBlockedPage(cookies.ADMIN, "/login?next=%2Fadmin");
  } finally { await database.user.deleteMany({ where: { id: { in: ids } } }); }
});
