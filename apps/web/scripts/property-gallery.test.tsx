import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyGallery } from "../src/components/properties/property-gallery";
import { PropertyImage } from "../src/components/properties/property-image";
import { sortPropertyImages } from "../src/lib/property";

const title = "Casa com jardim em São Paulo";
const images = [
  { id: "last", url: "https://res.cloudinary.com/demo/image/upload/jardim.jpg", position: 8, isMain: false },
  { id: "first", url: "https://res.cloudinary.com/demo/image/upload/sala.jpg", position: 0, isMain: false },
  { id: "main", url: "https://res.cloudinary.com/demo/image/upload/fachada.jpg", position: 3, isMain: true },
];

test("a galeria prioriza a principal e ordena as demais por posição sem modificar a resposta REST", () => {
  const snapshot = structuredClone(images);
  assert.deepEqual(sortPropertyImages(images).map(({ id }) => id), ["main", "first", "last"]);
  assert.deepEqual(sortPropertyImages(images.filter(({ isMain }) => !isMain)).map(({ id }) => id), ["first", "last"]);
  assert.deepEqual(images, snapshot);
  assert.deepEqual(sortPropertyImages([]), []);
});

test("sem fotos, os detalhes mantêm o espaço reservado e não oferecem controles vazios", () => {
  const markup = renderToStaticMarkup(<PropertyGallery title={title} images={[]} />);
  assert.match(markup, /aria-label="Galeria de fotos"/);
  assert.match(markup, /Imagem indisponível/);
  assert.doesNotMatch(markup, /<button|<img|Foto 1 de 0|Miniaturas|carrossel|role="status"/);
});

test("uma única foto tem texto alternativo e contagem, sem controles ou miniaturas redundantes", () => {
  const markup = renderToStaticMarkup(<PropertyGallery title={title} images={[images[1]]} />);
  assert.match(markup, /alt="Casa com jardim em São Paulo — Foto 1 de 1"/);
  assert.match(markup, /Foto 1 de 1<\/p>/);
  assert.equal(markup.match(/<img /g)?.length, 1);
  assert.doesNotMatch(markup, /<button|Miniaturas|carrossel/);
});

test("várias fotos começam na principal e oferecem miniaturas e navegação com estado acessível", () => {
  const markup = renderToStaticMarkup(<PropertyGallery title={title} images={images} />);
  assert.match(markup, /aria-roledescription="carrossel"/);
  assert.match(markup, /aria-label="Foto anterior"/);
  assert.match(markup, /aria-label="Próxima foto"/);
  assert.match(markup, /role="status" aria-live="polite" aria-atomic="true"[^>]*>Foto 1 de 3/);
  assert.match(markup, /aria-label="Miniaturas das fotos"/);
  assert.match(markup, /aria-label="Ver foto 1 de 3" aria-pressed="true"/);
  assert.match(markup, /aria-label="Ver foto 2 de 3" aria-pressed="false"/);
  assert.match(markup, /aria-label="Ver foto 3 de 3" aria-pressed="false"/);
  assert.match(markup, /Home abre a primeira foto e End abre a última/);
  assert.equal(markup.match(/<button /g)?.length, 5);
  assert.equal(markup.match(/<img /g)?.length, 4);
  const mainPhoto = markup.match(/<img [^>]*>/)?.[0] ?? "";
  assert.match(mainPhoto, /fachada/);
  assert.match(mainPhoto, /Foto 1 de 3/);
  assert.match(mainPhoto, /sizes=/);
  assert.doesNotMatch(mainPhoto, /loading="lazy"/);
  assert.equal(markup.match(/loading="lazy"/g)?.length, 3);
  assert.equal(markup.match(/alt=""/g)?.length, 3);
  assert.equal(markup.match(/<link rel="preload" as="image"/g)?.length, 1);
});

test("sem principal, a menor posição abre a galeria e URLs incompatíveis não bloqueiam os controles", () => {
  const withoutMain = images.filter(({ isMain }) => !isMain);
  const markup = renderToStaticMarkup(<PropertyGallery title={title} images={withoutMain} />);
  assert.match(markup.match(/<img [^>]*>/)?.[0] ?? "", /sala/);
  const broken = renderToStaticMarkup(<PropertyGallery title={title} images={[{ ...images[2], url: "https://example.com/foto.jpg" }, images[1]]} />);
  assert.match(broken, /Imagem indisponível/);
  assert.match(broken, /Próxima foto/);
  assert.match(broken, /Ver foto 2 de 2/);
  assert.doesNotMatch(broken, /example\.com/);
});

test("títulos são escapados e a ausência de imagem tem versão compacta para as miniaturas", () => {
  const markup = renderToStaticMarkup(<PropertyGallery title={'Casa <script>"teste"</script>'} images={[images[0]]} />);
  assert.match(markup, /&lt;script&gt;&quot;teste&quot;&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
  const compact = renderToStaticMarkup(<PropertyImage title="" compact />);
  assert.match(compact, /class="size-6"/);
  assert.match(compact, /class="sr-only">Imagem indisponível/);
});
