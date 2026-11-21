import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { adminDashboardSchema } from "@portal-inmobiliario/contracts/admin-dashboard";
import { GET } from "../src/app/api/admin/dashboard/route";
import { AuthError } from "../src/lib/auth/error";
import { sessionCookieName } from "../src/lib/auth/session";
import { authService } from "../src/services/auth-service";
import { adminDashboardService, createAdminDashboardService } from "../src/services/admin-dashboard-service";

const counts = { totalProperties: 16, publishedProperties: 14, saleProperties: 8, rentProperties: 8, totalUsers: 5, totalInquiries: 0 };
const token = "a".repeat(64);
const admin = { id: "a2050000-0000-4000-8000-000000000001", name: "Maria Silva", email: "maria@exemplo.test", role: "ADMIN" as const };
const request = (cookie = `${sessionCookieName()}=${token}`) => new Request("http://localhost:3001/api/admin/dashboard?role=ADMIN", {
  headers: { Cookie: cookie, "x-user-role": "ADMIN", "x-user-id": admin.id },
});
afterEach(() => mock.restoreAll());

test("contrato aceita zeros reais e rejeita contagens inválidas, inconsistentes e dados extras", () => {
  assert.deepEqual(adminDashboardSchema.parse(counts), counts);
  assert.ok(adminDashboardSchema.safeParse(Object.fromEntries(Object.keys(counts).map((key) => [key, 0]))).success);
  for (const patch of [{ totalUsers: -1 }, { totalUsers: 1.5 }, { totalUsers: "5" }, { totalUsers: Number.MAX_SAFE_INTEGER + 1 },
    { publishedProperties: 17 }, { saleProperties: 9 }, { users: [admin] }, { passwordHash: "privado" }]) {
    assert.equal(adminDashboardSchema.safeParse({ ...counts, ...patch }).success, false);
  }
});

test("serviço consulta a persistência a cada acesso e propaga falhas sem inventar totais", async () => {
  const getCounts = mock.fn(async () => counts);
  const service = createAdminDashboardService({ getCounts });
  assert.deepEqual(await service.getCounts(), counts);
  assert.deepEqual(await service.getCounts(), counts);
  assert.equal(getCounts.mock.callCount(), 2);
  getCounts.mock.mockImplementation(async () => { throw new Error("banco indisponível"); });
  await assert.rejects(service.getCounts());
});

test("API só consulta indicadores após ADMIN válido e retorna somente contagens sem cache", async () => {
  const lookup = mock.method(authService, "me", async () => ({ ...admin, role: "USER" as "USER" | "ADMIN" }));
  const aggregate = mock.method(adminDashboardService, "getCounts", async () => counts);
  const denied = await GET(request());
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("set-cookie"), null);
  assert.equal(aggregate.mock.callCount(), 0);
  lookup.mock.mockImplementation(async () => admin);
  const allowed = await GET(request());
  assert.equal(allowed.status, 200);
  assert.deepEqual(await allowed.json(), counts);
  assert.equal(aggregate.mock.callCount(), 1);
  lookup.mock.mockImplementation(async () => { throw new AuthError(401, "Entre novamente."); });
  for (const cookie of ["", `${sessionCookieName()}=ADMIN`, `${sessionCookieName()}=${token}`]) {
    const invalid = await GET(request(cookie));
    assert.equal(invalid.status, 401);
    assert.match(invalid.headers.get("set-cookie")!, /Max-Age=0/);
    assert.equal(invalid.headers.get("cache-control"), "no-store");
    assert.equal(invalid.headers.get("vary"), "Cookie");
  }
  assert.equal(aggregate.mock.callCount(), 1);
  for (const response of [denied, allowed]) {
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("vary"), "Cookie");
  }
});

test("falhas de consulta e de sessão não expõem detalhes nem contagens parciais", async () => {
  const lookup = mock.method(authService, "me", async () => admin);
  const aggregate = mock.method(adminDashboardService, "getCounts", async () => { throw new Error("senha privada do banco"); });
  const failed = await GET(request());
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { message: "Não foi possível carregar os indicadores. Tente novamente mais tarde.", status: 500 });
  lookup.mock.mockImplementation(async () => { throw new Error("token privado"); });
  const unavailable = await GET(request());
  assert.equal(unavailable.status, 500);
  assert.doesNotMatch(await unavailable.text(), /token|totalProperties|privado/);
  assert.equal(aggregate.mock.callCount(), 1);
  for (const response of [failed, unavailable]) {
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("vary"), "Cookie");
  }
});
