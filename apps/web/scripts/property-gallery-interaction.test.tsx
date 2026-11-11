import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { act } from "react";
import { JSDOM } from "jsdom";
import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, self: dom.window,
  HTMLElement: dom.window.HTMLElement, HTMLImageElement: dom.window.HTMLImageElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import("react-dom/client");
const { PropertyGallery } = await import("../src/components/properties/property-gallery");
const photos: PublicProperty["images"] = [
  { id: "garden", url: "https://res.cloudinary.com/demo/image/upload/jardim.jpg", position: 8, isMain: false },
  { id: "living", url: "https://res.cloudinary.com/demo/image/upload/sala.jpg", position: 0, isMain: false },
  { id: "main", url: "https://res.cloudinary.com/demo/image/upload/fachada.jpg", position: 3, isMain: true },
];
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
});
after(() => dom.window.close());

async function render(images = photos, propertyId = "first-property") {
  await act(() => root.render(<PropertyGallery key={propertyId} title="Casa em São Paulo" images={images} />));
}

function button(label: string) {
  const element = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  assert.ok(element, label);
  return element;
}

function assertSelected(position: number, file: string, total = 3) {
  assert.equal(container.querySelector('[role="status"]')?.textContent, `Foto ${position} de ${total}`);
  const mainImage = container.querySelector("img");
  assert.ok(mainImage?.getAttribute("src")?.includes(file));
  assert.equal(mainImage?.alt, `Casa em São Paulo — Foto ${position} de ${total}`);
  if (total > 1) {
    assert.equal(container.querySelectorAll('[aria-pressed="true"]').length, 1);
    assert.equal(button(`Ver foto ${position} de ${total}`).getAttribute("aria-pressed"), "true");
  }
}

test("botões e miniaturas mudam a foto e o contador, com volta circular e preservação do foco", async () => {
  await render();
  assertSelected(1, "fachada");
  const next = button("Próxima foto");
  next.focus();
  await act(() => next.click());
  assertSelected(2, "sala");
  assert.equal(document.activeElement, next);
  await act(() => button("Foto anterior").click());
  assertSelected(1, "fachada");
  await act(() => button("Foto anterior").click());
  assertSelected(3, "jardim");
  await act(() => next.click());
  assertSelected(1, "fachada");
  const thumbnail = button("Ver foto 3 de 3");
  thumbnail.focus();
  await act(() => thumbnail.click());
  assertSelected(3, "jardim");
  assert.equal(document.activeElement, thumbnail);
});

test("setas e Home/End navegam somente dentro da galeria, sem capturar Tab ou atalhos modificados", async () => {
  await render();
  const next = button("Próxima foto");
  next.focus();
  for (const [key, position, file] of [
    ["ArrowRight", 2, "sala"], ["End", 3, "jardim"], ["Home", 1, "fachada"], ["ArrowLeft", 3, "jardim"],
  ] as const) {
    const event = new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    await act(() => next.dispatchEvent(event));
    assert.equal(event.defaultPrevented, true);
    assertSelected(position, file);
    assert.equal(document.activeElement, next);
  }
  for (const options of [{ key: "Tab" }, { key: "ArrowRight", ctrlKey: true }, { key: "Home", altKey: true }, { key: "End", metaKey: true }]) {
    const event = new dom.window.KeyboardEvent("keydown", { ...options, bubbles: true, cancelable: true });
    await act(() => next.dispatchEvent(event));
    assert.equal(event.defaultPrevented, false);
    assertSelected(3, "jardim");
  }
  await act(() => document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
  assertSelected(3, "jardim");
});

test("falhas na foto e na miniatura mantêm a navegação e outra foto pode ser carregada", async () => {
  await render();
  const mainImage = container.querySelector("img");
  assert.ok(mainImage);
  await act(() => mainImage.dispatchEvent(new dom.window.Event("error")));
  assert.match(container.querySelector("section > div")?.textContent ?? "", /Imagem indisponível/);
  await act(() => button("Próxima foto").click());
  assertSelected(2, "sala");
  const thumbnail = button("Ver foto 3 de 3");
  const thumbnailImage = thumbnail.querySelector("img");
  assert.ok(thumbnailImage);
  await act(() => thumbnailImage.dispatchEvent(new dom.window.Event("error")));
  assert.match(thumbnail.textContent ?? "", /Imagem indisponível/);
  await act(() => thumbnail.click());
  assertSelected(3, "jardim");
});

test("a seleção acompanha o ID da foto, se recupera de remoções e reinicia ao mudar de imóvel", async () => {
  await render();
  await act(() => button("Ver foto 3 de 3").click());
  await render([...photos].reverse());
  assertSelected(3, "jardim");
  await render(photos.filter(({ id }) => id !== "garden"));
  assertSelected(1, "fachada", 2);
  await render();
  await act(() => button("Ver foto 2 de 3").click());
  await render(photos, "second-property");
  assertSelected(1, "fachada");
  await render([photos[1]]);
  assertSelected(1, "sala", 1);
  assert.equal(container.querySelectorAll("button").length, 0);
  await render([]);
  assert.match(container.textContent ?? "", /Imagem indisponível/);
  assert.equal(container.querySelectorAll("button, img").length, 0);
  assert.equal(container.querySelector('[role="status"]'), null);
});
