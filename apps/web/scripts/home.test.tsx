import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { HomePropertySection } from "../src/components/home/home-property-section";
import { fetchPublicProperties } from "../src/lib/api/properties";
import { selectHomeProperties, type HomeProperty } from "../src/lib/home";
import { formatPropertyPrice } from "../src/lib/property";
import { buildHomeSearchUrl, homeSearchSchema } from "../src/lib/home-search";

const property: HomeProperty = {
  id: "a2050000-0000-4000-8000-000000000001",
  title: "Casa com jardim em São Paulo",
  operation: "SALE",
  type: "HOUSE",
  price: "450000.10",
  neighborhood: "Pinheiros",
  city: "São Paulo",
  state: "SP",
  isFeatured: true,
  bedrooms: 3,
  bathrooms: 2,
  usableArea: "85.50",
  totalArea: "120.00",
  images: [],
};

afterEach(() => mock.restoreAll());

test("as seleções usam destaque e operação, limitam três itens e preservam a ordem e os dados da API", () => {
  const properties = Array.from({ length: 10 }, (_, index) => ({
    ...property,
    id: String(index),
    operation: index % 2 === 0 ? "SALE" as const : "RENT" as const,
    isFeatured: index % 3 === 0,
  }));
  const snapshot = structuredClone(properties);
  const groups = selectHomeProperties(properties);
  assert.deepEqual(groups.featured.map(({ id }) => id), ["0", "3", "6"]);
  assert.deepEqual(groups.sale.map(({ id }) => id), ["0", "2", "4"]);
  assert.deepEqual(groups.rent.map(({ id }) => id), ["1", "3", "5"]);
  assert.deepEqual(properties, snapshot);
  assert.deepEqual(selectHomeProperties([]), { featured: [], sale: [], rent: [] });
});

test("os preços usam BRL e pt-BR, com indicação mensal somente no aluguel", () => {
  const normalize = (value: string) => value.replace(/\s/g, " ");
  assert.equal(normalize(formatPropertyPrice(property)), "R$ 450.000,10");
  assert.equal(normalize(formatPropertyPrice({ price: "2500.00", operation: "RENT" })), "R$ 2.500,00/mês");
  assert.equal(normalize(formatPropertyPrice({ price: "999999999999.99", operation: "SALE" })), "R$ 999.999.999.999,99");
});

test("a busca valida limites, remove espaços externos e permite explorar sem texto", () => {
  assert.deepEqual(homeSearchSchema.parse({ search: " São Paulo ", operation: "SALE" }), {
    search: "São Paulo", operation: "SALE",
  });
  assert.ok(homeSearchSchema.safeParse({ search: "", operation: "" }).success);
  assert.ok(homeSearchSchema.safeParse({ search: "a".repeat(200), operation: "RENT" }).success);
  assert.equal(homeSearchSchema.safeParse({ search: "a".repeat(201), operation: "" }).success, false);
  assert.equal(homeSearchSchema.safeParse({ search: "Centro", operation: "ADMIN" }).success, false);
});

test("a navegação da busca preserva acentos e caracteres especiais como valores de consulta", () => {
  const url = new URL(buildHomeSearchUrl({
    search: " São Paulo & jardim? <casa> ", operation: "RENT",
  }), "http://localhost");
  assert.equal(url.pathname, "/properties");
  assert.equal(url.searchParams.get("search"), "São Paulo & jardim? <casa>");
  assert.equal(url.searchParams.get("operation"), "RENT");
  assert.equal(buildHomeSearchUrl({ search: "   ", operation: "" }), "/properties");
  assert.equal(buildHomeSearchUrl({ search: "", operation: "SALE" }), "/properties?operation=SALE");
});

test("o cliente REST consulta sem cache e valida somente os campos usados pela landing", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json([
    { ...property, description: "Outro campo do contrato público" },
  ]));
  assert.deepEqual(await fetchPublicProperties("/api/properties"), [property]);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, "/api/properties");
  assert.equal(options?.cache, "no-store");
  assert.ok(options?.signal instanceof AbortSignal);
});

test("o cliente aceita uma lista vazia e apresenta erro genérico para falha HTTP, rede ou contrato inválido", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json([]));
  assert.deepEqual(await fetchPublicProperties("/api/properties"), []);

  for (const response of [
    Response.json({ message: "Detalhe interno" }, { status: 500 }),
    Response.json({ properties: [] }),
    Response.json([{ ...property, price: 450000 }]),
    Response.json([{ ...property, operation: "INVALID" }]),
    Response.json([{ ...property, bedrooms: -1 }]),
    Response.json([{ ...property, bathrooms: 1.5 }]),
    Response.json([{ ...property, usableArea: 85.5 }]),
    Response.json([{ ...property, images: [{ url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" }] }]),
  ]) {
    fetchMock.mock.mockImplementation(async () => response);
    await assert.rejects(fetchPublicProperties("/api/properties"), {
      message: "Não foi possível carregar os imóveis.",
    });
  }
  fetchMock.mock.mockImplementation(async () => { throw new Error("Falha de rede"); });
  await assert.rejects(fetchPublicProperties("/api/properties"), {
    message: "Não foi possível carregar os imóveis.",
  });
});

test("o cliente REST preserva imagens e características opcionais usadas pelos cards", async () => {
  const propertyWithImage = {
    ...property,
    bedrooms: null,
    bathrooms: 0,
    usableArea: null,
    totalArea: "1000.50",
    images: [{
      id: "a2050000-0000-4000-8000-000000000002",
      url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      position: 0,
      isMain: true,
    }],
  };
  mock.method(globalThis, "fetch", async () => Response.json([propertyWithImage]));
  assert.deepEqual(await fetchPublicProperties("/api/properties"), [propertyWithImage]);
});

const sectionProps = {
  id: "test-section",
  eyebrow: "Para chamar de seu",
  title: "Imóveis à venda",
  description: "Opções no Brasil.",
  properties: [property],
  href: "/properties?operation=SALE",
  linkLabel: "Ver opções para comprar",
  emptyMessage: "Nenhum imóvel disponível no momento.",
  status: "ready" as const,
};

test("a seção exibe dados brasileiros, semântica e link para o catálogo, escapando conteúdo da API", () => {
  const markup = renderToStaticMarkup(<HomePropertySection {...sectionProps} properties={[
    { ...property, title: "Casa <script>teste</script>" },
  ]} />);
  assert.match(markup, /<section aria-labelledby="test-section"/);
  assert.match(markup, /<h2 id="test-section"/);
  assert.match(markup, /Pinheiros, São Paulo — SP/);
  assert.match(markup, /450\.000,10/);
  assert.match(markup, /href="\/properties\?operation=SALE"/);
  assert.match(markup, /Casa &lt;script&gt;teste&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
});

test("a seção diferencia carregamento, erro e lista vazia mantendo a navegação disponível", () => {
  for (const [status, message] of [
    ["loading", "Carregando imóveis…"],
    ["error", "Esta seleção está indisponível no momento."],
    ["ready", "Nenhum imóvel disponível no momento."],
  ] as const) {
    const markup = renderToStaticMarkup(
      <HomePropertySection {...sectionProps} properties={[]} status={status} />,
    );
    assert.ok(markup.includes(message));
    assert.match(markup, /Ver opções para comprar/);
    assert.doesNotMatch(markup, /<li/);
  }
});
