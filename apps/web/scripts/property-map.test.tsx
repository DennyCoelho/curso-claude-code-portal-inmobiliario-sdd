import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { PropertyMap } from "../src/components/properties/property-map";
import { buildPropertyMapLinks, formatPropertyMapAddress } from "../src/lib/property-map";

const property = {
  title: "Apartamento na Sé",
  address: "Praça da Sé", addressNumber: "s/n", addressComplement: "Apartamento 101",
  neighborhood: "Sé", city: "São Paulo", state: "SP", postalCode: "01001000", country: "BR",
};
const address = "Praça da Sé, s/n, Sé, São Paulo - SP, 01001-000, Brasil";

test("o endereço do mapa usa todos os campos brasileiros, preservando acentos, s/n e zero inicial do CEP", () => {
  const snapshot = structuredClone(property);
  assert.equal(formatPropertyMapAddress(property), address);
  assert.equal(formatPropertyMapAddress({ ...property, address: "  Praça  da\nSé ", city: " São  Paulo " }), address);
  assert.deepEqual(property, snapshot);
  assert.doesNotMatch(address, /Apartamento 101|latitude|longitude/);
});

test("mapa e link externo usam o mesmo endereço codificado, sem chave e sem coordenadas", () => {
  const { embedHref, externalHref } = buildPropertyMapLinks(property);
  const embed = new URL(embedHref);
  const external = new URL(externalHref);
  assert.equal(embed.origin, "https://maps.google.com");
  assert.equal(embed.pathname, "/maps");
  assert.equal(embed.searchParams.get("q"), address);
  assert.equal(embed.searchParams.get("output"), "embed");
  assert.equal(embed.searchParams.get("hl"), "pt-BR");
  assert.equal(embed.searchParams.get("gl"), "br");
  assert.equal(external.origin, "https://www.google.com");
  assert.equal(external.pathname, "/maps/search/");
  assert.equal(external.searchParams.get("api"), "1");
  assert.equal(external.searchParams.get("query"), address);
  for (const url of [embed, external]) {
    assert.equal(url.searchParams.has("key"), false);
    assert.equal(url.searchParams.has("center"), false);
    assert.equal(url.hash, "");
    assert.doesNotMatch(url.href, /Apartamento|undefined|null/);
  }
});

test("textos com caracteres especiais não injetam parâmetros, fragmentos ou outra origem nas URLs", () => {
  const unusual = { ...property, address: 'Rua A & B #1?key=segredo"<script>', addressNumber: "20-A", neighborhood: "Centro + Jardim" };
  const { embedHref, externalHref } = buildPropertyMapLinks(unusual, "15&output=outro");
  const embed = new URL(embedHref);
  const external = new URL(externalHref);
  assert.equal(embed.searchParams.get("q"), formatPropertyMapAddress(unusual));
  assert.equal(external.searchParams.get("query"), formatPropertyMapAddress(unusual));
  assert.equal(embed.searchParams.getAll("q").length, 1);
  assert.equal(embed.searchParams.get("z"), "15");
  assert.equal(embed.searchParams.get("output"), "embed");
  assert.equal(embed.searchParams.has("key"), false);
  assert.equal(embed.hash, "");
  assert.equal(external.hash, "");
  assert.doesNotMatch(embedHref, /<script>|"/);
});

test("a configuração de zoom aceita inteiros de zero a 21 e usa 15 para ausência ou valor inválido", () => {
  for (const value of [undefined, "", " ", "-1", "22", "1.5", "abc", "1e1", "Infinity", "15&x=1"]) {
    assert.equal(new URL(buildPropertyMapLinks(property, value).embedHref).searchParams.get("z"), "15");
  }
  for (const value of ["0", "1", "9", "10", "15", "21", " 18 "]) {
    assert.equal(new URL(buildPropertyMapLinks(property, value).embedHref).searchParams.get("z"), value.trim());
  }
});

test("a incorporação reserva espaço, carrega sob demanda e mantém um link acessível fora do iframe", () => {
  const dom = new JSDOM(renderToStaticMarkup(<PropertyMap property={property} zoom="18" />));
  try {
    const iframe = dom.window.document.querySelector("iframe");
    const link = dom.window.document.querySelector("a");
    assert.ok(iframe);
    assert.ok(link);
    assert.equal(iframe.title, `Mapa da localização de ${property.title}`);
    assert.equal(iframe.getAttribute("loading"), "lazy");
    assert.equal(iframe.getAttribute("referrerPolicy"), "no-referrer");
    assert.equal(iframe.hasAttribute("allowFullScreen"), true);
    assert.equal(iframe.width, "100%");
    assert.equal(iframe.height, "320");
    assert.equal(new URL(iframe.src).searchParams.get("z"), "18");
    assert.equal(new URL(link.href).searchParams.get("query"), address);
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
    assert.match(link.textContent ?? "", /Abrir no Google Maps.*abre em nova aba/);
    assert.match(dom.window.document.body.textContent ?? "", /Localização aproximada/);
    assert.match(dom.window.document.body.textContent ?? "", /Se o mapa não carregar/);
  } finally {
    dom.window.close();
  }
});

test("a renderização não faz novas consultas REST e escapa o título recebido", () => {
  const fetchMock = mock.method(globalThis, "fetch", () => { throw new Error("Não consultar serviços na renderização do mapa"); });
  try {
    const markup = renderToStaticMarkup(<PropertyMap property={{ ...property, title: '<script>"imóvel"</script>' }} />);
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.match(markup, /&lt;script&gt;&quot;imóvel&quot;&lt;\/script&gt;/);
    assert.doesNotMatch(markup, /<script|<input|<form|GOOGLE_MAPS_API_KEY|DATABASE_URL|latitude|longitude/);
  } finally {
    fetchMock.mock.restore();
  }
});
