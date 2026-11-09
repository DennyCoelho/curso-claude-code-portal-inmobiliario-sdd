import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";
import PropertyPage from "../src/app/properties/[id]/page";
import PropertyError from "../src/app/properties/[id]/error";
import PropertyLoading from "../src/app/properties/[id]/loading";
import PropertyNotFound from "../src/app/properties/[id]/not-found";
import { PropertyDetails } from "../src/components/properties/property-details";
import { PropertyCard } from "../src/components/properties/property-card";
import { fetchPublicProperty } from "../src/lib/api/properties";
import { buildPropertyDetailHref, getPropertyCatalogHref } from "../src/lib/property-navigation";

const property: PublicProperty = {
  id: "a2050000-0000-4000-8000-000000000001",
  title: "Apartamento com varanda na Sé",
  description: "Sala integrada e varanda.\nPróximo ao metrô.",
  operation: "SALE", type: "APARTMENT", price: "450000.10",
  usableArea: "85.50", totalArea: "120.75", bedrooms: 2, bathrooms: 1, parkingSpaces: 0, age: 1,
  address: "Praça da Sé", addressNumber: "s/n", addressComplement: "Apartamento 101",
  neighborhood: "Sé", city: "São Paulo", state: "SP", postalCode: "01001000", country: "BR",
  isFeatured: true, createdAt: "2026-01-01T01:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z",
  images: [], features: [{ id: "a2050000-0000-4000-8000-000000000002", name: "Elevador" }],
};

afterEach(() => mock.restoreAll());

test("o cliente de detalhes consulta um único imóvel por REST sem cache e preserva todo o contrato público", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({ ...property, privateNote: "Não expor" }));
  assert.deepEqual(await fetchPublicProperty(property.id.toUpperCase(), "http://api.local/"), property);
  assert.equal(fetchMock.mock.callCount(), 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, `http://api.local/api/properties/${property.id}`);
  assert.equal(options?.cache, "no-store");
  assert.ok(options?.signal instanceof AbortSignal);
});

test("UUID inválido e imóvel ausente não produzem dados nem confundem indisponibilidade com falha", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({ message: "Ausente" }, { status: 404 }));
  for (const id of ["invalido", "../api/properties", `${property.id}?isPublished=false`, "https://outro.local"]) assert.equal(await fetchPublicProperty(id, "http://api.local"), null);
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal(await fetchPublicProperty(property.id, "http://api.local"), null);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("falhas HTTP, rede, JSON ou contrato e resposta de outro imóvel expõem apenas mensagem genérica", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json(property));
  for (const value of [
    { ...property, id: "a2050000-0000-4000-8000-000000000099" }, { ...property, price: 1 },
    { ...property, postalCode: "1001000" }, { ...property, parkingSpaces: -1 }, { ...property, age: 1.5 },
    { ...property, description: null }, { ...property, addressComplement: 101 }, { ...property, country: "US" },
    { ...property, createdAt: "ontem" }, { ...property, features: [{ id: "invalido", name: "Elevador" }] },
  ]) {
    fetchMock.mock.mockImplementation(async () => Response.json(value));
    await assert.rejects(fetchPublicProperty(property.id, "http://api.local"), { message: "Não foi possível carregar o imóvel." });
  }
  fetchMock.mock.mockImplementation(async () => Response.json({ message: "Detalhe privado" }, { status: 500 }));
  await assert.rejects(fetchPublicProperty(property.id, "http://api.local"), { message: "Não foi possível carregar o imóvel." });
  fetchMock.mock.mockImplementation(async () => new Response("JSON inválido"));
  await assert.rejects(fetchPublicProperty(property.id, "http://api.local"), { message: "Não foi possível carregar o imóvel." });
  fetchMock.mock.mockImplementation(async () => { throw new Error("Segredo de conexão"); });
  await assert.rejects(fetchPublicProperty(property.id, "http://api.local"), { message: "Não foi possível carregar o imóvel." });
});

test("os detalhes exibem informações completas, BRL, CEP com zero inicial e datas no fuso brasileiro", () => {
  const markup = renderToStaticMarkup(<PropertyDetails property={property} />).replace(/\s/g, " ");
  for (const text of [property.title, "À venda", "Apartamento", "R$ 450.000,10", "Sobre o imóvel", "Sala integrada e varanda.",
    "Próximo ao metrô.", "85,5 m²", "120,75 m²", "Quartos", "Banheiros", "Vagas de garagem", "1 ano", "Elevador",
    "Praça da Sé, s/n", "Apartamento 101", "São Paulo — SP", "CEP 01001-000", "Brasil", "31 de dezembro de 2025", "1 de outubro de 2026",
  ]) assert.ok(markup.includes(text), text);
  assert.match(markup, /<h1 id="property-title"/);
  assert.match(markup, /<dl/);
  assert.match(markup, /<address/);
  assert.match(markup, /Imagem indisponível/);
  assert.doesNotMatch(markup, /\/mês|<form|<iframe|latitude|longitude/);
});

test("aluguel mensal, campos nulos e zeros têm apresentação correta, sem inventar informações", () => {
  const markup = renderToStaticMarkup(<PropertyDetails property={{ ...property, operation: "RENT", price: "2500.10", age: 0, bedrooms: 0 }} />).replace(/\s/g, " ");
  assert.match(markup, /Aluguel mensal/);
  assert.match(markup, /R\$ 2\.500,10\/mês/);
  assert.match(markup, /Novo/);
  assert.match(markup, /<dd[^>]*>0<\/dd>/);
  const empty = renderToStaticMarkup(<PropertyDetails property={{ ...property, type: "LAND", description: " ", features: [], addressComplement: null, age: null, bedrooms: null, bathrooms: null, parkingSpaces: null, usableArea: null, totalArea: null }} />);
  assert.match(empty, /Descrição não informada/);
  assert.match(empty, /Características não informadas/);
  assert.doesNotMatch(empty, /<dl|Informações do imóvel|Vagas de garagem|Idade do imóvel|Apartamento 101|NaN|null/);
});

test("os textos do imóvel são escapados na renderização", () => {
  const unsafe = renderToStaticMarkup(<PropertyDetails property={{ ...property, title: "Casa <script>teste</script>", description: "<img src=x onerror=alert(1)>", features: [{ ...property.features[0], name: "<script>segredo</script>" }] }} />);
  assert.match(unsafe, /&lt;script&gt;teste&lt;\/script&gt;/);
  assert.match(unsafe, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(unsafe, /<script>|<img src=x/);
});

test("os cards abrem os detalhes e o retorno conserva busca, tipos múltiplos e ordenação em caminho local", () => {
  const parameters = "search=São+Paulo&type=HOUSE&type=APARTMENT&minPrice=1234.56&sort=area_desc";
  const href = buildPropertyDetailHref(property.id, parameters);
  const detail = new URL(href, "http://localhost");
  assert.equal(detail.pathname, `/properties/${property.id}`);
  const back = new URL(getPropertyCatalogHref(detail.searchParams.get("from")!), "http://localhost");
  assert.equal(back.pathname, "/properties");
  assert.deepEqual([...back.searchParams], [...new URLSearchParams(parameters)]);
  for (const from of ["https://outro.local", "//outro.local", "javascript:alert(1)", undefined, ["sort=recent", "sort=price_asc"]]) {
    const url = new URL(getPropertyCatalogHref(from), "http://localhost");
    assert.equal(url.origin, "http://localhost");
    assert.equal(url.pathname, "/properties");
  }
  assert.equal(buildPropertyDetailHref(property.id), `/properties/${property.id}`);
  const card = renderToStaticMarkup(<PropertyCard property={property} catalogParameters={parameters} />);
  assert.ok(card.includes(href.replaceAll("&", "&amp;")));
  assert.match(card, /aria-label="Ver detalhes de Apartamento com varanda na Sé"/);
  assert.equal(card.match(/<a /g)?.length, 1);
});

test("a rota renderiza os dados REST no servidor e o retorno aos resultados sem consultar a listagem", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json(property));
  const page = await PropertyPage({ params: Promise.resolve({ id: property.id }), searchParams: Promise.resolve({ from: "sort=price_asc&type=HOUSE&type=APARTMENT" }) });
  const markup = renderToStaticMarkup(page);
  assert.ok(markup.includes(property.title));
  assert.match(markup, /href="\/properties\?sort=price_asc&amp;type=HOUSE&amp;type=APARTMENT"/);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.ok(String(fetchMock.mock.calls[0].arguments[0]).endsWith(`/api/properties/${property.id}`));
});

test("a rota sinaliza notFound para inválidos e ausentes e propaga falhas à fronteira de erro", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response(null, { status: 404 }));
  for (const id of ["invalido", property.id]) {
    await assert.rejects(PropertyPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }), (error: unknown) => error instanceof Error && "digest" in error && error.digest === "NEXT_HTTP_ERROR_FALLBACK;404");
  }
  assert.equal(fetchMock.mock.callCount(), 1);
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 500 }));
  await assert.rejects(PropertyPage({ params: Promise.resolve({ id: property.id }), searchParams: Promise.resolve({}) }), { message: "Não foi possível carregar o imóvel." });
});

test("carregamento, ausência e erro têm estados acessíveis e navegação ou nova tentativa", () => {
  const loading = renderToStaticMarkup(<PropertyLoading />);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /role="status"[^>]*>Carregando imóvel…/);
  assert.match(loading, /aria-hidden="true"/);
  assert.match(loading, /motion-safe:animate-pulse/);
  const missing = renderToStaticMarkup(<PropertyNotFound />);
  assert.match(missing, /Imóvel não encontrado/);
  assert.match(missing, /href="\/properties"/);
  const failure = renderToStaticMarkup(<PropertyError error={new Error("Detalhe privado")} retry={() => {}} />);
  assert.match(failure, /role="alert"/);
  assert.match(failure, /Tentar novamente/);
  assert.match(failure, /href="\/properties"/);
  assert.doesNotMatch(failure, /Detalhe privado/);
});
