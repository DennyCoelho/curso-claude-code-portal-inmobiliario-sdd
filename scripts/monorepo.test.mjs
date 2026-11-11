import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";

const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
const apiUrl = process.env.API_URL ?? "http://127.0.0.1:3001";

function request(origin, path, options = {}) {
  return fetch(new URL(path, origin), {
    ...options,
    signal: AbortSignal.timeout(15_000),
  });
}

test("os dois apps respondem e o frontend encaminha a verificação de saúde", async () => {
  const responses = await Promise.all([
    request(apiUrl, "/api/health"),
    request(webUrl, "/api/health"),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "ok" });
  }
});

test("o frontend continua servindo a landing page em português", async () => {
  const response = await request(webUrl, "/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  const html = await response.text();
  assert.match(html, /lang="pt-BR"/);
  assert.match(html, /Imóveis/);
});

test("o frontend serve o catálogo público com navegação e carregamento acessível", async () => {
  const response = await request(webUrl, "/properties");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  const html = await response.text();
  assert.match(html, /lang="pt-BR"/);
  assert.match(html, /<h1[^>]*>Imóveis<\/h1>/);
  assert.match(html, /id="main-content"/);
  assert.match(html, /Carregando imóveis…/);
  assert.doesNotMatch(html, /catálogo.*disponível em breve/);
});

test("o encaminhamento preserva o erro REST e o cache de IDs inválidos", async () => {
  for (const origin of [apiUrl, webUrl]) {
    const response = await request(origin, "/api/properties/invalido");
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), {
      message: "Identificador de imóvel inválido.",
      status: 400,
    });
  }
});

test("a listagem e os detalhes chegam pelo frontend com o mesmo contrato do backend", async (context) => {
  const path = "/api/properties?operation=SALE&city=S%C3%A3o+Paulo";
  const [direct, proxied] = await Promise.all([
    request(apiUrl, path),
    request(webUrl, path),
  ]);
  assert.equal(direct.status, 200, "A API exige um PostgreSQL configurado e migrado.");
  assert.equal(proxied.status, 200);
  const properties = await direct.json();
  assert.ok(Array.isArray(properties));
  assert.deepEqual(await proxied.json(), properties);
  assert.equal(proxied.headers.get("cache-control"), "no-store");

  await context.test("os detalhes mantêm precisão decimal e privacidade dos dados", {
    skip: properties.length === 0 ? "Nenhum imóvel publicado no banco." : false,
  }, async () => {
    const detailPath = `/api/properties/${properties[0].id}`;
    const [directDetail, proxiedDetail] = await Promise.all([
      request(apiUrl, detailPath),
      request(webUrl, detailPath),
    ]);
    assert.equal(directDetail.status, 200);
    assert.equal(proxiedDetail.status, 200);
    const property = await proxiedDetail.json();
    assert.deepEqual(property, await directDetail.json());
    assert.match(property.price, /^\d+\.\d{2}$/);
    assert.equal(property.country, "BR");
    assert.equal("inquiries" in property, false);
    assert.equal("favorites" in property, false);
    assert.ok(property.images.every((image) => !("publicId" in image)));
  });
});

test("o encaminhamento preserva métodos HTTP não permitidos", async () => {
  for (const origin of [apiUrl, webUrl]) {
    const response = await request(origin, "/api/properties", { method: "POST" });
    assert.equal(response.status, 405);
  }
});

test("a busca chega ao PostgreSQL pelo frontend e preserva resultados, ordem e contrato", async () => {
  const response = await request(apiUrl, "/api/properties");
  assert.equal(response.status, 200);
  const properties = await response.json();
  for (const search of [" São Paulo ", "pinheiros", "sp", "sem-resultado-etapa-10", "%_\\", "   "]) {
    const path = `/api/properties?${new URLSearchParams({ search })}`;
    const expected = properties.filter((property) => [
      property.title, property.neighborhood, property.city, property.state, property.description,
    ].some((value) => value.toLowerCase().includes(search.trim().toLowerCase())));
    for (const origin of [apiUrl, webUrl]) {
      const result = await request(origin, path);
      assert.equal(result.status, 200);
      assert.equal(result.headers.get("cache-control"), "no-store");
      assert.deepEqual(await result.json(), expected);
    }
  }
});

test("a busca preserva erros 400 no proxy e preenche o formulário ao abrir a URL diretamente", async () => {
  for (const path of ["/api/properties?search=SP&search=PR", `/api/properties?search=${"a".repeat(201)}`]) {
    const direct = await request(apiUrl, path);
    const proxied = await request(webUrl, path);
    assert.equal(direct.status, 400);
    assert.equal(proxied.status, 400);
    assert.deepEqual(await proxied.json(), await direct.json());
  }
  const response = await request(webUrl, "/properties?search=S%C3%A3o+Paulo&operation=SALE");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /role="search" aria-label="Buscar no catálogo"/);
  assert.match(html, /value="São Paulo"/);
  assert.match(html, /type="hidden" name="operation" value="SALE"/);
});

test("os filtros combinados chegam ao PostgreSQL e mantêm o contrato pelo proxy", async () => {
  const allResponse = await request(apiUrl, "/api/properties");
  assert.equal(allResponse.status, 200);
  const properties = await allResponse.json();
  for (const operation of ["SALE", "RENT"]) {
    const path = `/api/properties?operation=${operation}&minPrice=0&bathrooms=2&minUsableArea=0`;
    const expected = properties.filter((property) => property.operation === operation && property.bathrooms === 2 && property.usableArea !== null);
    for (const origin of [apiUrl, webUrl]) {
      const response = await request(origin, path);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), expected);
    }
  }
  for (const query of ["state=XX", "operation=SALE&operation=RENT", "minPrice=100&maxPrice=99", "bathrooms=-1"]) {
    const direct = await request(apiUrl, `/api/properties?${query}`);
    const proxied = await request(webUrl, `/api/properties?${query}`);
    assert.equal(direct.status, 400);
    assert.equal(proxied.status, 400);
    assert.deepEqual(await proxied.json(), await direct.json());
  }
  const response = await request(webUrl, "/properties?search=jardim&operation=RENT&type=HOUSE&city=Recife&state=PE");
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /aria-labelledby="catalog-filters-title"/);
  assert.match(html, /value="RENT" selected=""/);
  assert.match(html, /id="filter-city"[^>]*value="Recife"/);
  assert.match(html, /href="\/properties\?search=jardim"/);
});

test("seleção múltipla, quartos exatos e faixa de preço funcionam pelos dois aplicativos", async () => {
  const listResponse = await request(apiUrl, "/api/properties");
  assert.equal(listResponse.status, 200);
  const properties = await listResponse.json();
  for (const name of ["bedrooms", "bathrooms"]) for (const value of ["1", "2", "3", "4+"]) {
    const query = new URLSearchParams({ [name]: value });
    query.append("type", "HOUSE");
    query.append("type", "APARTMENT");
    const expected = properties.filter((property) => ["HOUSE", "APARTMENT"].includes(property.type)
      && (value === "4+" ? property[name] >= 4 : property[name] === Number(value)));
    for (const origin of [apiUrl, webUrl]) {
      const response = await request(origin, `/api/properties?${query}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), expected);
    }
  }
  for (const operation of ["", "SALE", "RENT"]) {
    const prices = properties.filter((property) => !operation || property.operation === operation)
      .map(({ price }) => price).sort((first, second) => Number(first) - Number(second));
    for (const origin of [apiUrl, webUrl]) {
      const response = await request(origin, `/api/properties/price-range${operation ? `?operation=${operation}` : ""}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), { minPrice: prices[0] ?? null, maxPrice: prices.at(-1) ?? null });
    }
  }
});

test("as cinco ordenações funcionam diretamente e pelo proxy, preservando filtros e erros", async () => {
  const listResponse = await request(apiUrl, "/api/properties");
  assert.equal(listResponse.status, 200);
  const properties = await listResponse.json();
  const decimalCompare = (first, second) => {
    const left = BigInt(first.replace(".", ""));
    const right = BigInt(second.replace(".", ""));
    return left < right ? -1 : left > right ? 1 : 0;
  };
  for (const sort of ["recent", "price_asc", "price_desc", "area_asc", "area_desc"]) {
    for (const operation of ["", "SALE"]) {
      const expected = properties.filter((property) => !operation || property.operation === operation).toSorted((first, second) => {
        let difference = 0;
        if (sort.startsWith("price_")) difference = decimalCompare(first.price, second.price) * (sort === "price_asc" ? 1 : -1);
        if (sort.startsWith("area_")) {
          if (first.usableArea === null && second.usableArea !== null) return 1;
          if (second.usableArea === null && first.usableArea !== null) return -1;
          if (first.usableArea !== null && second.usableArea !== null) difference = decimalCompare(first.usableArea, second.usableArea) * (sort === "area_asc" ? 1 : -1);
        }
        return difference || second.createdAt.localeCompare(first.createdAt) || first.id.localeCompare(second.id);
      });
      const query = new URLSearchParams({ sort, ...(operation ? { operation } : {}) });
      for (const origin of [apiUrl, webUrl]) {
        const response = await request(origin, `/api/properties?${query}`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(await response.json(), expected, `${origin}: ${query}`);
      }
    }
  }
  for (const query of ["sort=oldest", "sort=recent&sort=price_asc", "sort=&sort="]) {
    const direct = await request(apiUrl, `/api/properties?${query}`);
    const proxied = await request(webUrl, `/api/properties?${query}`);
    assert.equal(direct.status, 400);
    assert.equal(proxied.status, 400);
    assert.deepEqual(await proxied.json(), await direct.json());
  }
  const page = await request(webUrl, "/properties?search=jardim&type=HOUSE&type=APARTMENT&sort=area_desc");
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /aria-label="Ordenar imóveis"/);
  assert.match(html, /value="area_desc" selected=""/);
  assert.match(html, /href="\/properties\?search=jardim&amp;sort=area_desc"/);
});

test("os detalhes de venda, aluguel e terreno chegam renderizados ao frontend por REST", async (context) => {
  const response = await request(apiUrl, "/api/properties");
  assert.equal(response.status, 200);
  const properties = await response.json();
  if (!properties.length) { context.skip("Nenhum imóvel publicado no banco."); return; }
  const selected = [properties.find(({ operation }) => operation === "SALE"), properties.find(({ operation }) => operation === "RENT"), properties.find(({ type }) => type === "LAND")].filter(Boolean);
  const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
  for (const property of selected) {
    const from = "search=São+Paulo&type=HOUSE&type=APARTMENT&sort=price_asc";
    const page = await request(webUrl, `/properties/${property.id}?${new URLSearchParams({ from })}`);
    assert.equal(page.status, 200);
    const html = (await page.text()).replace(/<!--[\s\S]*?-->/g, "");
    assert.ok(html.includes(escapeHtml(property.title)));
    assert.ok(html.includes(escapeHtml(property.description)));
    assert.match(html, /id="property-title"/);
    assert.match(html, /Sobre o imóvel/);
    assert.match(html, /aria-label="Galeria de fotos"/);
    if (!property.images.length) {
      assert.match(html, /Imagem indisponível/);
      assert.doesNotMatch(html, /aria-label="Foto anterior"|aria-label="Próxima foto"/);
    }
    assert.match(html, /Características/);
    assert.match(html, /<address/);
    assert.ok(html.includes(`${property.postalCode.slice(0, 5)}-${property.postalCode.slice(5)}`));
    assert.ok(html.includes(property.operation === "RENT" ? "Aluguel mensal" : "Valor de venda"));
    assert.match(html, /href="\/properties\?search=S%C3%A3o\+Paulo&amp;type=HOUSE&amp;type=APARTMENT&amp;sort=price_asc"/);
    assert.doesNotMatch(html, /DATABASE_URL|publicId|passwordHash|<iframe|<form/);
  }
});

test("detalhes inválidos e inexistentes mostram ausência com noindex sem expor erros internos", async () => {
  for (const id of ["invalido", randomUUID()]) {
    const response = await request(webUrl, `/properties/${id}`);
    assert.ok([200, 404].includes(response.status));
    const html = await response.text();
    assert.match(html, /Imóvel não encontrado/);
    assert.match(html, /name="robots" content="noindex"/);
    assert.match(html, /Ver imóveis disponíveis/);
    assert.doesNotMatch(html, /DATABASE_URL|passwordHash|postgresql:\/\//);
  }
});
