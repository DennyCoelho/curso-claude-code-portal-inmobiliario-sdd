import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PropertyCard } from "../src/components/properties/property-card";
import { PropertyGrid } from "../src/components/properties/property-grid";
import {
  formatPropertyArea,
  isCloudinaryImageUrl,
  selectPropertyImage,
  type PropertyCardData,
} from "../src/lib/property";

const property: PropertyCardData = {
  id: "a2050000-0000-4000-8000-000000000001",
  title: "Apartamento com varanda em São Paulo",
  operation: "SALE",
  type: "APARTMENT",
  price: "450000.10",
  neighborhood: "Pinheiros",
  city: "São Paulo",
  state: "SP",
  bedrooms: 1,
  bathrooms: 1,
  usableArea: "85.50",
  totalArea: "120.00",
  images: [],
};

test("a imagem principal tem prioridade; sem principal, a menor posição vence sem alterar os dados", () => {
  const images = [
    { id: "last", url: "last.jpg", position: 8, isMain: false },
    { id: "first", url: "first.jpg", position: 0, isMain: false },
    { id: "main", url: "main.jpg", position: 3, isMain: true },
  ];
  const snapshot = structuredClone(images);
  assert.equal(selectPropertyImage(images)?.id, "main");
  assert.equal(selectPropertyImage(images.filter((image) => !image.isMain))?.id, "first");
  assert.deepEqual(images, snapshot);
  assert.equal(selectPropertyImage([]), undefined);
});

test("as áreas usam separadores brasileiros e até duas casas decimais", () => {
  assert.equal(formatPropertyArea("85.50"), "85,5 m²");
  assert.equal(formatPropertyArea("1000.00"), "1.000 m²");
  assert.equal(formatPropertyArea("1000.75"), "1.000,75 m²");
});

test("o card apresenta venda em BRL, localização, título sem truncamento e características no singular", () => {
  const markup = renderToStaticMarkup(<PropertyCard property={property} />).replace(/\s/g, " ");
  for (const text of [
    "<article", "<h3", property.title, "Apartamento", "À venda", "R$ 450.000,10",
    "Pinheiros, São Paulo — SP", "1 quarto", "1 banheiro", "Área útil", "85,5 m²",
  ]) assert.ok(markup.includes(text), text);
  assert.doesNotMatch(markup, /\/mês|Área total|120 m²/);
});

test("o card identifica aluguel mensal, plural e contagens iguais a zero", () => {
  const markup = renderToStaticMarkup(<PropertyCard property={{
    ...property, operation: "RENT", price: "2500.00", bedrooms: 0, bathrooms: 2,
  }} />).replace(/\s/g, " ");
  assert.match(markup, /Aluguel/);
  assert.match(markup, /R\$ 2\.500,00\/mês/);
  assert.match(markup, /0 quartos/);
  assert.match(markup, /2 banheiros/);
});

test("campos nulos são omitidos; terrenos usam a área total com identificação explícita", () => {
  const land = { ...property, type: "LAND" as const, bedrooms: null, bathrooms: null, usableArea: null };
  const markup = renderToStaticMarkup(<PropertyCard property={land} />);
  assert.match(markup, /Terreno/);
  assert.match(markup, /Área total/);
  assert.match(markup, /120 m²/);
  assert.doesNotMatch(markup, /quarto|banheiro|Área útil|null/);
  const withoutArea = renderToStaticMarkup(<PropertyCard property={{ ...land, totalArea: null }} />);
  assert.doesNotMatch(withoutArea, /<dl|m²|NaN/);
});

test("imóveis sem imagem ou com URL incompatível exibem o espaço reservado e preservam o conteúdo", () => {
  assert.equal(isCloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/v123/casa.jpg"), true);
  for (const url of [
    "", "invalid", "https://example.com/casa.jpg", "http://res.cloudinary.com/demo/image/upload/casa.jpg",
    "https://res.cloudinary.com/demo/video/upload/casa.mp4",
    "https://res.cloudinary.com/demo/image/upload/casa.jpg?unexpected=1",
  ]) {
    assert.equal(isCloudinaryImageUrl(url), false, url);
    const markup = renderToStaticMarkup(<PropertyCard property={{
      ...property, images: url ? [{ id: "photo", url, position: 0, isMain: true }] : [],
    }} />);
    assert.match(markup, /Imagem indisponível/);
    assert.ok(markup.includes(property.title));
    assert.doesNotMatch(markup, /<img/);
  }
});

test("a grade usa lista semântica, preserva a ordem e escapa conteúdo recebido da API", () => {
  const markup = renderToStaticMarkup(<PropertyGrid properties={[
    { ...property, title: "Primeiro <script>alert(1)</script>" },
    { ...property, id: "second", title: "Segundo imóvel" },
  ]} />);
  assert.match(markup, /^<ul/);
  assert.equal(markup.match(/<li /g)?.length, 2);
  assert.equal(markup.match(/<article /g)?.length, 2);
  assert.ok(markup.indexOf("Primeiro") < markup.indexOf("Segundo"));
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
  assert.doesNotMatch(renderToStaticMarkup(<PropertyGrid properties={[]} />), /<li|<article/);
});
