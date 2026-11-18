import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";
import { act, useEffect } from "react";
import { JSDOM } from "jsdom";
import { SWRConfig, useSWRConfig } from "swr";
import type { AuthenticatedUser } from "@portal-inmobiliario/contracts/auth";
import { favoriteQuerySchema } from "@portal-inmobiliario/contracts/favorites";
import type { PropertyCardData } from "../src/lib/property";
import { buildAccountFavoritesUrl, buildFavoritesQuery, parseAccountFavorites } from "../src/lib/favorites";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/account" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, self: dom.window,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
const { FavoritesProvider } = await import("../src/components/favorites/favorites-provider");
const { FavoriteButton } = await import("../src/components/favorites/favorite-button");
const { AccountFavorites } = await import("../src/components/favorites/account-favorites");
const { changeFavorite, fetchFavorites } = await import("../src/lib/api/favorites");
const user: AuthenticatedUser = { id: "a2050000-0000-4000-8000-000000000001", name: "João", email: "joao@example.com", role: "USER" };
const property: PropertyCardData = { id: "a2050000-0000-4000-8000-000000000002", title: "Apartamento em São Paulo", operation: "RENT",
  type: "APARTMENT", price: "2500.00", neighborhood: "Centro", city: "São Paulo", state: "SP", bedrooms: 1,
  bathrooms: 1, usableArea: "50.00", totalArea: null, images: [] };
const collection = (count: number) => Array.from({ length: count }, (_, index) => ({ ...property,
  id: `a2050000-0000-4000-8000-${String(index + 2).padStart(12, "0")}`, title: `Imóvel ${index + 1}` }));
let container: HTMLDivElement; let root: ReturnType<typeof createRoot>;
let mutateAuth: (account: AuthenticatedUser | null) => Promise<unknown>;
let pushes: string[]; let replacements: string[];
const router = { back() {}, forward() {}, refresh() {}, prefetch() {}, bfcacheId: "favorites-test",
  push(url: string) { pushes.push(url); }, replace(url: string) { replacements.push(url); } };
function CacheControl() {
  const { mutate } = useSWRConfig();
  useEffect(() => { mutateAuth = (account) => mutate("/api/auth/me", account, { revalidate: false }); }, [mutate]);
  return null;
}
beforeEach(() => { pushes = []; replacements = []; container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(() => root.unmount()); container.remove(); mock.restoreAll(); });
after(() => dom.window.close());
async function render(account: AuthenticatedUser | null = user, parameters = "") {
  const cache = new Map();
  await act(async () => { root.render(<AppRouterContext.Provider value={router}><SWRConfig value={{ provider: () => cache,
    fallback: { "/api/auth/me": account }, revalidateOnFocus: false, dedupingInterval: 0 }}><CacheControl /><FavoritesProvider>
    <FavoriteButton property={property} /><FavoriteButton property={property} /><AccountFavorites parameters={parameters} />
  </FavoritesProvider></SWRConfig></AppRouterContext.Provider>); });
}
const buttons = () => Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'));
const cards = () => container.querySelectorAll('section[aria-labelledby="account-favorites-title"] article');
const click = async (button: HTMLButtonElement) => { await act(async () => { button.click(); }); };
function server(initial: PropertyCardData[] = []) {
  const state: { items: PropertyCardData[]; account: AuthenticatedUser; listStatus: number; writeStatus: number; pending: boolean; finish?: (response: Response) => void } = {
    items: initial, account: user, listStatus: 200, writeStatus: 200, pending: false,
  };
  const calls = mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost:3000");
    if (url.pathname === "/api/auth/me") return Response.json({ user: state.account });
    if (url.pathname === "/api/favorites/ids") return Response.json(state.items.map((item) => item.id));
    if (init?.method === "POST" || init?.method === "DELETE") {
      const actor = state.account.id;
      const response = state.pending ? await new Promise<Response>((resolve) => { state.finish = resolve; })
        : state.writeStatus !== 200 ? Response.json({}, { status: state.writeStatus })
        : init.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ propertyId: property.id, isFavorite: true });
      if (response.ok && state.account.id === actor) {
        const id = url.pathname.split("/").at(-1);
        state.items = init.method === "DELETE" ? state.items.filter((item) => item.id !== id) : [property, ...state.items.filter((item) => item.id !== property.id)];
      }
      return response;
    }
    if (state.listStatus !== 200) return Response.json({}, { status: state.listStatus });
    const query = favoriteQuerySchema.parse(Object.fromEntries(url.searchParams));
    let items = state.items.filter((item) => (!query.search || `${item.title} ${item.city}`.includes(query.search))
      && (!query.operation || item.operation === query.operation) && (!query.type || item.type === query.type));
    if (query.sort === "price_asc") items = items.toSorted((a, b) => Number(a.price) - Number(b.price));
    const totalPages = Math.ceil(items.length / 9); const page = Math.min(query.page, Math.max(1, totalPages));
    return Response.json({ items: items.slice((page - 1) * 9, page * 9), total: items.length, page, pageSize: 9, totalPages });
  });
  return { state, calls };
}

test("visitante recebe link de entrada sem consultar IDs nem páginas privadas", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({}, { status: 401 }));
  await render(null); assert.ok(container.querySelector('a[href="/login?next=%2Faccount"]')); assert.equal(buttons().length, 0);
  assert.equal(calls.mock.calls.filter((call) => String(call.arguments[0]).startsWith("/api/favorites")).length, 0);
});

test("IDs compartilhados e escrita pendente bloqueiam duplicação e confirmam depois da resposta", async () => {
  const { state, calls } = server(); state.pending = true;
  await render(); assert.equal(buttons().length, 2);
  assert.equal(calls.mock.calls.filter((call) => call.arguments[0] === "/api/favorites/ids").length, 1);
  await click(buttons()[0]); await click(buttons()[1]);
  assert.equal(calls.mock.calls.filter((call) => call.arguments[1]?.method === "POST").length, 1);
  assert.ok(buttons().every((button) => button.disabled && button.getAttribute("aria-pressed") === "false"));
  assert.match(container.textContent!, /Salvando/); assert.doesNotMatch(container.textContent!, /Imóvel salvo nos favoritos/);
  await act(async () => { state.finish!(Response.json({ propertyId: property.id, isFavorite: true })); });
  assert.ok(buttons().every((button) => button.getAttribute("aria-pressed") === "true"));
  assert.match(container.textContent!, /1–1 de 1 imóvel salvo/); assert.match(container.textContent!.replace(/\s/g, " "), /R\$ 2\.500,00\/mês/);
});

test("remoção preserva favorito em falha, recarrega página e preserva foco após sucesso", async () => {
  const { state } = server([property]); state.writeStatus = 500;
  await render(); await click(buttons()[0]); assert.equal(buttons()[0].getAttribute("aria-pressed"), "true");
  assert.match(container.textContent!, /Não foi possível atualizar/);
  state.writeStatus = 200; state.pending = true;
  const removal = buttons().at(-1)!; removal.focus(); await click(removal); removal.blur();
  await act(async () => { state.finish!(new Response(null, { status: 204 })); });
  assert.equal(document.activeElement?.id, "account-favorites-title"); assert.equal(cards().length, 0);
  assert.match(container.textContent!, /ainda não tem imóveis favoritos/);
});

test("página exibe nove cards, intervalo, navegação e estado de favorito fora da página", async () => {
  server(collection(23)); await render(user, "favoritesPage=2");
  assert.equal(cards().length, 9); assert.match(container.textContent!, /10–18 de 23 imóveis salvos/);
  assert.equal(buttons()[0].getAttribute("aria-pressed"), "true");
  assert.equal(container.querySelector('a[aria-current="page"]')?.textContent, "2");
  const next = Array.from(container.querySelectorAll("a")).find((link) => link.textContent === "Próxima")!;
  assert.match(next.getAttribute("href")!, /favoritesPage=3/);
});

test("remoção do último item corrige a última página, preenche nove e atualiza URL", async () => {
  server(collection(10)); await render(user, "favoritesPage=2"); assert.equal(cards().length, 1);
  const removal = buttons().at(-1)!; removal.focus(); await click(removal);
  assert.equal(cards().length, 9); assert.match(container.textContent!, /1–9 de 9 imóveis salvos/);
  assert.equal(replacements.at(-1), "/account#account-favorites-title");
});

test("filtros usam URL, voltam à página 1 e diferenciam ausência de resultados", async () => {
  server(collection(23)); await render(user, "favoritesPage=2&favoritesOperation=RENT&favoritesSort=price_asc");
  const input = container.querySelector<HTMLInputElement>('#favorites-search')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, "São Paulo");
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    container.querySelector('form[aria-label="Filtrar favoritos"]')!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  });
  const target = new URL(pushes.at(-1)!, "http://localhost");
  assert.equal(target.searchParams.get("favoritesPage"), null); assert.equal(target.searchParams.get("favoritesSearch"), "São Paulo");
  assert.equal(target.searchParams.get("favoritesOperation"), "RENT"); assert.equal(target.searchParams.get("favoritesSort"), "price_asc");
});

test("filtro sem resultados mantém controles para corrigir a seleção", async () => {
  const { calls } = server(); await render(user, "favoritesSearch=inexistente");
  assert.match(container.textContent!, /Nenhum favorito corresponde/); assert.ok(container.querySelector('form[aria-label="Filtrar favoritos"]'));
  assert.equal(calls.mock.calls.filter((call) => String(call.arguments[0]).startsWith("/api/favorites?")).length, 1);
});

test("URL inválida bloqueia consulta paginada e mantém filtros para recuperação", async () => {
  const { calls } = server(); await render(user, "favoritesPage=2&favoritesPage=3");
  assert.match(container.textContent!, /Informe apenas um valor/); assert.ok(container.querySelector('form[aria-label="Filtrar favoritos"]'));
  assert.equal(calls.mock.calls.filter((call) => /^\/api\/favorites(?:\?|$)/.test(String(call.arguments[0]))).length, 0);
});

test("consulta inicial pendente mantém progresso até receber a página real", async () => {
  let finish!: (response: Response) => void;
  mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => String(input) === "/api/auth/me" ? Response.json({ user })
    : String(input) === "/api/favorites/ids" ? Response.json([]) : new Promise<Response>((resolve) => { finish = resolve; }));
  await render(); assert.match(container.textContent!, /Carregando seus favoritos/); assert.equal(cards().length, 0);
  await act(async () => { finish(Response.json({ items: [], total: 0, page: 1, pageSize: 9, totalPages: 0 })); });
  assert.match(container.textContent!, /ainda não tem imóveis favoritos/);
});

test("erro de recarga oferece recuperação e não transforma escrita confirmada em falha", async () => {
  const { state } = server([property]); await render(); state.listStatus = 500;
  await click(buttons()[0]); assert.equal(buttons()[0].getAttribute("aria-pressed"), "false");
  assert.match(container.textContent!, /Imóvel removido dos favoritos/); assert.match(container.textContent!, /Não foi possível carregar seus favoritos/);
  state.listStatus = 200;
  const retry = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Tentar novamente")!;
  await click(retry); assert.match(container.textContent!, /ainda não tem imóveis favoritos/);
});

for (const status of [200, 401]) test(`resposta tardia ${status} não altera a sessão ou os favoritos da nova conta`, async () => {
  const { state } = server(); state.pending = true; await render(); await click(buttons()[0]);
  state.account = { ...user, id: "a2050000-0000-4000-8000-000000000003" };
  await act(async () => { await mutateAuth(state.account); });
  await act(async () => { state.finish!(status === 200 ? Response.json({ propertyId: property.id, isFavorite: true }) : Response.json({}, { status })); });
  assert.equal(buttons()[0].getAttribute("aria-pressed"), "false"); assert.equal(cards().length, 0);
  await act(async () => { await mutateAuth(null); }); assert.equal(buttons().length, 0);
});

test("sessão expirada na escrita oculta favoritos privados e pede nova entrada", async () => {
  const { state } = server([property]); state.writeStatus = 401; await render(); await click(buttons()[0]);
  assert.equal(buttons().length, 0); assert.equal(cards().length, 0); assert.ok(container.querySelector('a[href="/login?next=%2Faccount"]'));
});

test("URLs preservam filtros e parâmetros independentes, validam repetição e usam caminho local", () => {
  const query = favoriteQuerySchema.parse({ page: 3, search: "Sé & centro", operation: "RENT", type: "APARTMENT", sort: "price_desc" });
  const href = buildAccountFavoritesUrl(query, "section=perfil&favoritesPage=2");
  const url = new URL(href, "http://localhost"); assert.equal(url.pathname, "/account"); assert.equal(url.searchParams.get("section"), "perfil");
  assert.deepEqual(parseAccountFavorites(url.searchParams.toString()), { success: true, query });
  assert.match(buildFavoritesQuery(query), /page=3/);
  assert.equal(parseAccountFavorites("favoritesPage=2&favoritesPage=3").success, false);
});

test("cliente recusa páginas incompatíveis, identidade de imóvel errada e respostas privadas", async () => {
  const calls = mock.method(globalThis, "fetch", async () => Response.json({ propertyId: user.id, isFavorite: true }));
  await assert.rejects(changeFavorite(property.id, true), /confirmar a alteração/);
  calls.mock.mockImplementation(async () => Response.json({ items: [property], total: 23, page: 1, pageSize: 9, totalPages: 3 }));
  await assert.rejects(fetchFavorites(), /carregar seus favoritos/);
  calls.mock.mockImplementation(async () => Response.json({ segredo: "privado" }, { status: 404 }));
  await assert.rejects(changeFavorite(property.id, true), { status: 404, message: "Este imóvel não está mais disponível." });
  calls.mock.mockImplementation(async () => { throw new Error("senha-privada"); }); await assert.rejects(fetchFavorites(), /Verifique sua conexão/);
});
