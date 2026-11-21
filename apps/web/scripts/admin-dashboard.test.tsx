import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { AdminDashboard } from "../src/components/admin/admin-dashboard";
import AdminLoading from "../src/app/(private)/admin/loading";
import AdminError from "../src/app/(private)/admin/error";

test("painel apresenta seis totais reais com semântica e números brasileiros", () => {
  const document = new JSDOM(renderToStaticMarkup(<AdminDashboard dashboard={{ totalProperties: 1234, publishedProperties: 1000,
    saleProperties: 1000, rentProperties: 234, totalUsers: 5678, totalInquiries: 0 }} />)).window.document;
  assert.equal(document.querySelectorAll("h1").length, 1);
  assert.equal(document.querySelector("h1")?.textContent, "Painel administrativo");
  assert.deepEqual(Array.from(document.querySelectorAll("dt"), (node) => node.textContent), ["Total de imóveis", "Imóveis publicados", "Imóveis à venda", "Imóveis para aluguel", "Usuários", "Consultas"]);
  assert.deepEqual(Array.from(document.querySelectorAll("dl > div"), (node) => node.querySelector("dd")?.textContent), ["1.234", "1.000", "1.000", "234", "5.678", "0"]);
  assert.match(document.body.textContent!, /rascunhos/);
  assert.match(document.body.textContent!, /inativas/);
  assert.match(document.body.textContent!, /visitantes/);
  assert.ok(document.querySelector('section[aria-labelledby="admin-indicators-title"]'));
  assert.deepEqual(Array.from(document.querySelectorAll("nav a"), (node) => node.getAttribute("href")), ["/account", "/properties", "/login"]);
  assert.doesNotMatch(document.body.textContent!, /Em breve|API|PostgreSQL/);
});

test("painel vazio preserva seis zeros; carregamento e erro não simulam totais", () => {
  const document = new JSDOM(renderToStaticMarkup(<AdminDashboard dashboard={{ totalProperties: 0, publishedProperties: 0,
    saleProperties: 0, rentProperties: 0, totalUsers: 0, totalInquiries: 0 }} />)).window.document;
  assert.deepEqual(Array.from(document.querySelectorAll("dl > div"), (node) => node.querySelector("dd")?.textContent), Array(6).fill("0"));
  const loading = new JSDOM(renderToStaticMarkup(<AdminLoading />)).window.document;
  assert.match(loading.querySelector('[role="status"]')?.textContent ?? "", /Carregando painel administrativo/);
  assert.ok(loading.querySelector('[aria-busy="true"]'));
  assert.equal(loading.querySelectorAll("dd").length, 0);
  const error = new JSDOM(renderToStaticMarkup(<AdminError retry={() => {}} />)).window.document;
  assert.match(error.querySelector('[role="alert"]')?.textContent ?? "", /Não foi possível carregar/);
  assert.equal(error.querySelector("button")?.textContent, "Tentar novamente");
  assert.equal(error.querySelectorAll("dd").length, 0);
});
