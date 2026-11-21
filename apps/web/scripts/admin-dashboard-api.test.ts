import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { fetchAdminDashboard } from "../src/lib/api/admin-dashboard";

const counts = { totalProperties: 16, publishedProperties: 14, saleProperties: 8, rentProperties: 8, totalUsers: 5, totalInquiries: 0 };
const cookie = `portal_session=${"a".repeat(64)}`;
afterEach(() => mock.restoreAll());

test("painel consulta REST fixa com apenas cookies de sessão, timeout e sem cache/redirecionamento", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json(counts));
  assert.deepEqual(await fetchAdminDashboard(`theme=dark; ${cookie}; analytics=privado`, "http://localhost:3001/"), { status: "authorized", dashboard: counts });
  assert.equal(calls.mock.calls[0].arguments[0], "http://localhost:3001/api/admin/dashboard");
  const options = calls.mock.calls[0].arguments[1] as RequestInit;
  assert.deepEqual(options.headers, { Accept: "application/json", Cookie: cookie });
  assert.equal(options.cache, "no-store");
  assert.equal(options.redirect, "error");
  assert.ok(options.signal instanceof AbortSignal);
  await fetchAdminDashboard(cookie, "http://localhost:3001");
  assert.equal(calls.mock.callCount(), 2);
});

test("painel bloqueia sessão ausente, USER, sessão inválida e duplicada sem expor indicadores", async () => {
  const calls = mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  for (const value of ["", "theme=dark", "portal_session=ADMIN"]) {
    assert.deepEqual(await fetchAdminDashboard(value, "http://localhost:3001"), { status: "unauthenticated" });
  }
  assert.equal(calls.mock.callCount(), 0);
  assert.deepEqual(await fetchAdminDashboard(cookie, "http://localhost:3001"), { status: "unauthenticated" });
  await fetchAdminDashboard(`${cookie}; ${cookie}`, "http://localhost:3001");
  assert.equal(new Headers((calls.mock.calls[1].arguments[1] as RequestInit).headers).get("Cookie"), `${cookie}; ${cookie}`);
  calls.mock.mockImplementation(async () => new Response(null, { status: 403 }));
  assert.deepEqual(await fetchAdminDashboard(cookie, "http://localhost:3001"), { status: "forbidden" });
});

test("erro HTTP, rede, JSON e contrato inválido bloqueiam indicadores com mensagem recuperável", async () => {
  const calls = mock.method(globalThis, "fetch", async () => new Response("segredo", { status: 500 }));
  const check = () => assert.rejects(fetchAdminDashboard(cookie, "http://localhost:3001"), { message: "Não foi possível carregar os indicadores. Tente novamente." });
  await check();
  for (const body of [{}, { ...counts, totalUsers: -1 }, { ...counts, publishedProperties: 20 }, { ...counts, email: "privado" }]) {
    calls.mock.mockImplementation(async () => Response.json(body));
    await check();
  }
  calls.mock.mockImplementation(async () => new Response("inválido"));
  await check();
  calls.mock.mockImplementation(async () => { throw new Error("token privado"); });
  await check();
  calls.mock.mockImplementation(async () => Response.json(counts));
  assert.deepEqual(await fetchAdminDashboard(cookie, "http://localhost:3001"), { status: "authorized", dashboard: counts });
});
