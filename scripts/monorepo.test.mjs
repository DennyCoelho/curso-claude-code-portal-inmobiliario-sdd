import assert from "node:assert/strict";
import { test } from "node:test";

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
