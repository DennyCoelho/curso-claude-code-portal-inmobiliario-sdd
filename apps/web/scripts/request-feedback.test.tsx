import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { act, Suspense, use, useState, type ReactNode } from "react";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, self: dom.window,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import("react-dom/client");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
const { RetryButton } = await import("../src/components/ui/retry-button");
const { HomeSearch } = await import("../src/components/home/home-search");
const { PropertyCatalogSearch } = await import("../src/components/properties/property-catalog-search");
const { PropertyCatalogSort } = await import("../src/components/properties/property-catalog-sort");
const { PropertyCatalogFilters } = await import("../src/components/properties/property-catalog-filters");
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => { container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(() => root.unmount()); container.remove(); });
after(() => dom.window.close());

test("nova tentativa aguarda a Promise, mostra progresso e impede cliques simultâneos", async () => {
  let finish!: () => void;
  let calls = 0;
  await act(() => root.render(<RetryButton onRetry={() => { calls++; return new Promise<void>((resolve) => { finish = resolve; }); }} />));
  const button = container.querySelector("button")!;
  await act(async () => { button.click(); button.click(); });
  assert.equal(calls, 1);
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute("aria-busy"), "true");
  assert.equal(button.textContent, "Tentando novamente…");
  assert.ok(button.querySelector('svg[aria-hidden="true"]'));
  await act(async () => finish());
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Tentar novamente");
});

test("falha em nova tentativa libera o botão sem rejeição não tratada", async () => {
  let calls = 0;
  await act(() => root.render(<RetryButton onRetry={async () => { calls++; throw new Error("Falha de rede simulada"); }} />));
  const button = container.querySelector("button")!;
  await act(async () => button.click());
  assert.equal(button.disabled, false);
  await act(async () => button.click());
  assert.equal(calls, 2);
  assert.equal(button.textContent, "Tentar novamente");
});

for (const [label, form] of [
  ["Buscando…", <HomeSearch key="home" />],
  ["Buscando…", <PropertyCatalogSearch key="catalog" parameters="" />],
  ["Ordenando…", <PropertyCatalogSort key="sort" parameters="" />],
  ["Aplicando filtros…", <PropertyCatalogFilters key="filters" parameters="" />],
] as const) {
  test(`navegação de ${form.key} indica ${label} até o destino estar pronto`, async () => {
    let finish!: () => void;
    let pushes = 0;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    function Destination() { use(pending); return <p>Destino carregado</p>; }
    function Harness({ children }: { children: ReactNode }) {
      const [navigated, setNavigated] = useState(false);
      return <AppRouterContext.Provider value={{
        back() {}, forward() {}, refresh() {}, replace() {}, prefetch() {}, bfcacheId: "feedback-test",
        push() { pushes++; setNavigated(true); },
      }}><Suspense fallback={<p>Carregando destino…</p>}>{navigated ? <Destination /> : children}</Suspense></AppRouterContext.Provider>;
    }
    await act(() => root.render(<Harness>{form}</Harness>));
    const currentForm = container.querySelector("form")!;
    await act(async () => currentForm.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
    const button = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    assert.equal(pushes, 1);
    assert.equal(currentForm.getAttribute("aria-busy"), "true");
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, label);
    await act(async () => currentForm.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
    assert.equal(pushes, 1);
    await act(async () => finish());
    assert.match(container.textContent!, /Destino carregado/);
  });
}
