import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import { createDatabaseClient } from "../src/lib/db/client";
import { newSession } from "../src/lib/auth/session";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(() => database.$disconnect());
const apiUrl = process.env.AUTH_TEST_API_URL ?? "http://localhost:3001";
const webUrl = process.env.WEB_URL ?? "http://localhost:3000";

test("favoritos por HTTP direto/proxy isolam contas, publicação, sessão e origem sem manter dados temporários", async () => {
  const ids: string[] = [];
  try {
    const absent = await fetch(`${apiUrl}/api/favorites`); assert.equal(absent.status, 401);
    const cookieName = absent.headers.get("set-cookie")!.split("=")[0];
    const accounts: { user: { id: string }; session: ReturnType<typeof newSession>; cookie: string }[] = [];
    for (const role of ["USER", "ADMIN"] as const) {
      const session = newSession(new Date());
      const user = await database.user.create({ data: { name: "Favoritos HTTP", email: `favorites-http-${randomUUID()}@example.com`,
        passwordHash: "hash-exclusivo-do-teste", role, sessions: { create: { tokenHash: session.tokenHash, expiresAt: session.expiresAt } } } });
      ids.push(user.id); accounts.push({ user, session, cookie: `${cookieName}=${session.token}` });
    }
    const published = await database.property.findFirstOrThrow({ where: { isPublished: true } });
    const unpublished = await database.property.findFirstOrThrow({ where: { isPublished: false } });
    const publishedProperties = await database.property.findMany({ where: { isPublished: true }, orderBy: { id: "asc" } });
    for (const origin of [apiUrl, webUrl]) {
      const call = (path: string, method = "GET", cookie = accounts[0].cookie, extra: Record<string, string> = {}) => fetch(`${origin}${path}`, {
        method, headers: { Cookie: cookie, "x-user-id": accounts[1].user.id, "x-user-role": "ADMIN", ...extra }, signal: AbortSignal.timeout(15_000),
      });
      for (const account of accounts) {
        assert.deepEqual((await (await call("/api/favorites", "GET", account.cookie)).json()).items, []);
        for (let attempt = 0; attempt < 2; attempt++) {
          const saved = await call(`/api/favorites/${published.id}?userId=${accounts[1].user.id}`, "POST", account.cookie);
          assert.equal(saved.status, 200); assert.deepEqual(await saved.json(), { propertyId: published.id, isFavorite: true });
          assert.equal(saved.headers.get("cache-control"), "no-store"); assert.match(saved.headers.get("vary")!, /Cookie/i);
        }
        assert.equal(await database.favorite.count({ where: { userId: account.user.id } }), 1);
        const response = await call("/api/favorites", "GET", account.cookie); const result = await response.json(); const list = result.items;
        assert.equal(result.pageSize, 9); assert.equal(result.total, 1);
        assert.deepEqual(await (await call("/api/favorites/ids", "GET", account.cookie)).json(), [published.id]);
        assert.equal((await call("/api/favorites?page=0", "GET", account.cookie)).status, 400);
        assert.equal((await (await call("/api/favorites?search=inexistente-xxx", "GET", account.cookie)).json()).total, 0);
        assert.equal(list.length, 1); assert.equal(list[0].id, published.id); assert.equal(list[0].price, published.price.toFixed(2));
        assert.doesNotMatch(JSON.stringify(list), /passwordHash|publicId|userId/);
        for (const id of [unpublished.id, randomUUID()]) assert.equal((await call(`/api/favorites/${id}`, "POST", account.cookie)).status, 404);
        assert.equal((await call("/api/favorites/invalido", "POST", account.cookie)).status, 400);
        assert.equal((await call(`/api/favorites/${published.id}`, "DELETE", account.cookie, { Origin: "https://externo.example" })).status, 403);
        assert.equal((await call(`/api/favorites/${published.id}`, "DELETE", account.cookie)).status, 204);
        assert.equal((await call(`/api/favorites/${published.id}`, "DELETE", account.cookie)).status, 204);
      }
      await call(`/api/favorites/${published.id}`, "POST");
      assert.deepEqual((await (await call("/api/favorites", "GET", accounts[1].cookie)).json()).items, []);
      await call(`/api/favorites/${published.id}`, "DELETE", accounts[1].cookie);
      assert.equal((await (await call("/api/favorites")).json()).items.length, 1);
      await call(`/api/favorites/${published.id}`, "DELETE");
      for (const method of ["GET", "POST", "DELETE"]) {
        const path = method === "GET" ? "/api/favorites" : `/api/favorites/${published.id}`;
        const response = await call(path, method, ""); assert.equal(response.status, 401);
      }
      await database.favorite.createMany({ data: publishedProperties.map((property) => ({ userId: accounts[0].user.id, propertyId: property.id })) });
      const firstPage = await (await call("/api/favorites")).json();
      const secondPage = await (await call("/api/favorites?page=2")).json();
      assert.equal(firstPage.items.length, 9); assert.equal(firstPage.total, publishedProperties.length);
      assert.equal(secondPage.items.length, publishedProperties.length - 9); assert.equal(secondPage.page, 2);
      assert.equal(new Set([...firstPage.items, ...secondPage.items].map((property: { id: string }) => property.id)).size, publishedProperties.length);
      const filtered = await (await call("/api/favorites?operation=RENT&type=APARTMENT&sort=price_asc")).json();
      assert.equal(filtered.total, publishedProperties.filter((property) => property.operation === "RENT" && property.type === "APARTMENT").length);
      for (const property of secondPage.items) assert.equal((await call(`/api/favorites/${property.id}`, "DELETE")).status, 204);
      const corrected = await (await call("/api/favorites?page=2")).json();
      assert.equal(corrected.page, 1); assert.equal(corrected.items.length, 9); assert.equal(corrected.total, 9);
      await database.favorite.deleteMany({ where: { userId: accounts[0].user.id } });
    }
    await database.user.update({ where: { id: accounts[0].user.id }, data: { isActive: false } });
    assert.equal((await fetch(`${apiUrl}/api/favorites`, { headers: { Cookie: accounts[0].cookie } })).status, 401);
    await database.session.update({ where: { tokenHash: accounts[1].session.tokenHash }, data: { expiresAt: new Date(0) } });
    assert.equal((await fetch(`${webUrl}/api/favorites`, { headers: { Cookie: accounts[1].cookie } })).status, 401);
  } finally { await database.user.deleteMany({ where: { id: { in: ids } } }); }
});
