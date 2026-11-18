import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { GET } from "../src/app/api/favorites/route";
import { GET as GET_IDS } from "../src/app/api/favorites/ids/route";
import { favoriteQuerySchema } from "@portal-inmobiliario/contracts/favorites";
import { POST, DELETE } from "../src/app/api/favorites/[propertyId]/route";
import { authService } from "../src/services/auth-service";
import { createFavoriteService, favoriteService } from "../src/services/favorite-service";
import { AuthError } from "../src/lib/auth/error";
import { sessionCookieName } from "../src/lib/auth/session";

const user = { id: "a2050000-0000-4000-8000-000000000001", name: "João", email: "joao@example.com", role: "USER" as const };
const propertyId = "a2050000-0000-4000-8000-000000000002";
const emptyPage = { items: [], total: 0, page: 1, pageSize: 9 as const, totalPages: 0 };
const context = (value = propertyId) => ({ params: Promise.resolve({ propertyId: value }) });
const request = (method = "GET", headers: Record<string, string> = {}) => new Request(`http://localhost:3001/api/favorites/${propertyId}?userId=outro`, {
  method, headers: { Cookie: `${sessionCookieName()}=${"a".repeat(64)}`, "x-user-id": "outro", ...headers },
});
afterEach(() => mock.restoreAll());

test("serviço valida/normaliza UUID antes da persistência e distingue indisponibilidade de repetição", async () => {
  const repository = { ids: mock.fn(async () => []), list: mock.fn(async () => emptyPage), add: mock.fn(async () => true), remove: mock.fn(async () => {}) };
  const service = createFavoriteService(repository);
  for (const value of ["invalido", `${propertyId}?userId=outro`, "../properties"]) {
    await assert.rejects(service.add(user.id, value), { status: 400 });
    await assert.rejects(service.remove(user.id, value), { status: 400 });
  }
  assert.equal(repository.add.mock.callCount(), 0); assert.equal(repository.remove.mock.callCount(), 0);
  assert.deepEqual(await service.add(user.id, propertyId.toUpperCase()), { propertyId, isFavorite: true });
  await service.add(user.id, propertyId); await service.remove(user.id, propertyId);
  assert.deepEqual(repository.add.mock.calls[0].arguments, [user.id, propertyId]);
  repository.add.mock.mockImplementation(async () => false);
  await assert.rejects(service.add(user.id, propertyId), { status: 404, message: "Imóvel indisponível." });
});

test("três endpoints usam somente a identidade autenticada, aceitam ADMIN e não armazenam cache", async () => {
  const me = mock.method(authService, "me", async () => user);
  const list = mock.method(favoriteService, "list", async () => emptyPage);
  const ids = mock.method(favoriteService, "ids", async () => [propertyId]);
  const add = mock.method(favoriteService, "add", async () => ({ propertyId, isFavorite: true as const }));
  const remove = mock.method(favoriteService, "remove", async () => {});
  for (const role of ["USER", "ADMIN"] as const) {
    me.mock.mockImplementation(async () => ({ ...user, role }));
    const responses = [await GET(request()), await POST(request("POST"), context()), await DELETE(request("DELETE"), context())];
    assert.deepEqual(responses.map((response) => response.status), [200, 200, 204]);
    for (const response of responses) {
      assert.equal(response.headers.get("cache-control"), "no-store"); assert.match(response.headers.get("vary")!, /Cookie/);
    }
    assert.deepEqual(await responses[0].json(), emptyPage); assert.equal(await responses[2].text(), "");
    assert.deepEqual(await (await GET_IDS(request())).json(), [propertyId]);
  }
  assert.deepEqual(list.mock.calls[0].arguments, [user.id, favoriteQuerySchema.parse({})]);
  assert.deepEqual(ids.mock.calls[0].arguments, [user.id]);
  assert.deepEqual(add.mock.calls[0].arguments, [user.id, propertyId]);
  assert.deepEqual(remove.mock.calls[0].arguments, [user.id, propertyId]);
});

test("sessão inválida e origem externa bloqueiam favoritos antes de consultar ou gravar", async () => {
  mock.method(authService, "me", async () => { throw new AuthError(401, "Entre na sua conta."); });
  const list = mock.method(favoriteService, "list"); const add = mock.method(favoriteService, "add"); const remove = mock.method(favoriteService, "remove");
  for (const response of [await GET(request()), await GET_IDS(request()), await POST(request("POST"), context()), await DELETE(request("DELETE"), context())]) {
    assert.equal(response.status, 401); assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
  }
  for (const method of ["POST", "DELETE"]) {
    const handler = method === "POST" ? POST : DELETE;
    assert.equal((await handler(request(method, { Origin: "https://externo.example" }), context())).status, 403);
  }
  assert.equal(list.mock.callCount() + add.mock.callCount() + remove.mock.callCount(), 0);
});

test("rotas preservam 400/404 e falhas internas não expõem detalhes de banco", async () => {
  mock.method(authService, "me", async () => user);
  const repository = { ids: mock.fn(async () => []), list: mock.fn(async () => emptyPage), add: mock.fn(async () => false), remove: mock.fn(async () => {}) };
  const service = createFavoriteService(repository);
  mock.method(favoriteService, "add", service.add); mock.method(favoriteService, "remove", service.remove);
  assert.equal((await POST(request("POST"), context("invalido"))).status, 400);
  assert.equal((await DELETE(request("DELETE"), context("invalido"))).status, 400);
  assert.equal((await POST(request("POST"), context())).status, 404);
  mock.method(favoriteService, "list", async () => { throw new Error("senha e SQL privados"); });
  const failed = await GET(request()); assert.equal(failed.status, 500);
  assert.doesNotMatch(await failed.text(), /SQL|senha/); assert.equal(failed.headers.get("cache-control"), "no-store");
});

test("paginação/filtros recusam valores inválidos e repetidos antes da persistência", async () => {
  mock.method(authService, "me", async () => user);
  const list = mock.method(favoriteService, "list", async () => emptyPage);
  for (const query of ["page=0", "page=-1", "page=1.5", "page=1000001", "page=2&page=3", "sort=invalid", "operation=BUY", "type=BOAT", `search=${"a".repeat(201)}`, "search=um&search=dois"]) {
    assert.equal((await GET(new Request(`http://localhost/api/favorites?${query}`))).status, 400, query);
  }
  assert.equal(list.mock.callCount(), 0);
  const response = await GET(new Request("http://localhost/api/favorites?page=2&search=%20S%C3%A9%20&operation=RENT&type=APARTMENT&sort=price_asc"));
  assert.equal(response.status, 200);
  assert.deepEqual(list.mock.calls[0].arguments, [user.id, { page: 2, search: "Sé", operation: "RENT", type: "APARTMENT", sort: "price_asc" }]);
});
