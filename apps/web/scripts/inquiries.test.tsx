import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";
import { act, useEffect } from "react";
import { JSDOM } from "jsdom";
import { SWRConfig, useSWRConfig } from "swr";
import type { AuthenticatedUser } from "@portal-inmobiliario/contracts/auth";
import { fetchInquiries } from "../src/lib/api/inquiries";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/account" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, self: dom.window,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { AccountInquiries } = await import("../src/components/account/account-inquiries");
const user: AuthenticatedUser = { id: "a2050000-0000-4000-8000-000000000001", name: "Maria", email: "maria@exemplo.test", role: "USER" };
const property = { id: "a2050000-0000-4000-8000-000000000002", title: "Apartamento na Sé" };
const item = { id: "a2050000-0000-4000-8000-000000000003", createdAt: "2026-11-19T15:00:00.000Z", message: "Gostaria de agendar uma visita.", property };
const page = (items = [item]) => ({ items, total: items.length, page: 1, pageSize: 10, totalPages: items.length ? 1 : 0 });
let container: HTMLDivElement; let root: ReturnType<typeof createRoot>;
let mutateAuth: (account: AuthenticatedUser | null) => Promise<unknown>;
function CacheControl() {
  const { mutate } = useSWRConfig();
  useEffect(() => { mutateAuth = (account) => mutate("/api/auth/me", account, { revalidate: false }); }, [mutate]);
  return null;
}
beforeEach(() => { container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(() => root.unmount()); container.remove(); mock.restoreAll(); });
after(() => dom.window.close());
async function render(account: AuthenticatedUser | null = user, parameters = "") {
  const cache = new Map();
  await act(async () => root.render(<SWRConfig value={{ provider: () => cache, fallback: { "/api/auth/me": account }, revalidateOnFocus: false, dedupingInterval: 0 }}>
    <CacheControl /><AccountInquiries parameters={parameters} />
  </SWRConfig>));
}

test("consulta em carregamento só aparece após confirmação e exibe mensagem, imóvel e data brasileira", async () => {
  let finish!: (value: Response) => void;
  mock.method(globalThis, "fetch", async (url: RequestInfo | URL) => String(url) === "/api/auth/me" ? Response.json({ user }) : new Promise<Response>((resolve) => { finish = resolve; }));
  await render(); assert.match(container.textContent!, /Carregando suas consultas/); assert.doesNotMatch(container.textContent!, /Apartamento na Sé/);
  await act(async () => { finish(Response.json(page())); });
  assert.match(container.textContent!, /1–1 de 1 consulta registrada/); assert.match(container.textContent!, /19\/11\/2026.*12:00/);
  assert.equal(container.querySelector(`a[href="/properties/${property.id}"]`)?.textContent, property.title);
  assert.equal(container.querySelector("time")?.dateTime, item.createdAt); assert.match(container.textContent!, /Gostaria de agendar/);
});

test("visitante não consulta histórico e uma conta sem consultas recebe estado vazio", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({}, { status: 401 }));
  await render(null); assert.ok(container.querySelector('a[href="/login?next=%2Faccount"]'));
  assert.equal(calls.mock.calls.filter((call) => String(call.arguments[0]).startsWith("/api/inquiries")).length, 0);
  calls.mock.mockImplementation(async (url: RequestInfo | URL) => Response.json(String(url) === "/api/auth/me" ? { user } : page([])));
  await act(() => root.unmount()); root = createRoot(container); await render();
  assert.match(container.textContent!, /ainda não registrou consultas/);
});

test("falhas permitem nova tentativa e imóveis indisponíveis não têm link nem título atual", async () => {
  let failed = true;
  mock.method(globalThis, "fetch", async (url: RequestInfo | URL) => String(url) === "/api/auth/me" ? Response.json({ user })
    : failed ? Response.json({}, { status: 500 }) : Response.json(page([{ ...item, property: null } as never])));
  await render(); assert.match(container.querySelector('[role="alert"]')?.textContent ?? "", /Não foi possível carregar/);
  failed = false;
  await act(async () => { container.querySelector<HTMLButtonElement>("button")!.click(); });
  assert.match(container.textContent!, /Imóvel indisponível/); assert.equal(container.querySelectorAll('a[href^="/properties/"]').length, 0);
  assert.doesNotMatch(container.textContent!, /Apartamento na Sé/);
});

test("logout e troca de conta ocultam dados anteriores e ignoram respostas tardias", async () => {
  let finish!: (value: Response) => void;
  mock.method(globalThis, "fetch", async (url: RequestInfo | URL) => String(url) === "/api/auth/me" ? Response.json({ user }) : new Promise<Response>((resolve) => { finish = resolve; }));
  await render();
  await act(async () => { await mutateAuth(null); });
  await act(async () => { finish(Response.json(page())); });
  assert.doesNotMatch(container.textContent!, /Apartamento na Sé/);
  const other = { ...user, id: property.id };
  await act(async () => { await mutateAuth(other); });
  assert.match(container.textContent!, /Carregando suas consultas/); assert.doesNotMatch(container.textContent!, /Apartamento na Sé/);
  await act(async () => { finish(Response.json(page([]))); });
  assert.match(container.textContent!, /ainda não registrou consultas/);
});

test("paginação preserva parâmetros dos favoritos e recusa URL inválida sem consultar a API", async () => {
  const calls = mock.method(globalThis, "fetch", async (url: RequestInfo | URL) => Response.json(String(url) === "/api/auth/me" ? { user }
    : { items: [item, { ...item, id: user.id }], total: 12, page: 2, pageSize: 10, totalPages: 2 }));
  await render(user, "favoritesSearch=S%C3%A9&favoritesPage=2&inquiriesPage=2");
  assert.match(container.textContent!, /11–12 de 12 consultas/);
  assert.equal(container.querySelector('nav[aria-label="Páginas de consultas"] a')?.getAttribute("href"), "/account?favoritesSearch=S%C3%A9&favoritesPage=2#account-inquiries");
  await act(() => root.unmount()); root = createRoot(container);
  const previous = calls.mock.callCount();
  await render(user, "inquiriesPage=2&inquiriesPage=3");
  assert.match(container.textContent!, /Página de consultas inválida/);
  assert.ok(calls.mock.calls.slice(previous).every((call) => String(call.arguments[0]) === "/api/auth/me"));
});

test("cliente valida contrato, paginação e sessão sem expor erros privados", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json(page()));
  assert.deepEqual(await fetchInquiries(1), page());
  calls.mock.mockImplementation(async () => Response.json({ ...page(), total: 20 }));
  await assert.rejects(fetchInquiries(1), { status: 0 });
  calls.mock.mockImplementation(async () => Response.json({ message: "privado" }, { status: 401 }));
  await assert.rejects(fetchInquiries(1), { status: 401, message: "Não foi possível carregar suas consultas. Tente novamente." });
});
