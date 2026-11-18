import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import type { AuthenticatedUser } from "@portal-inmobiliario/contracts/auth";
import { AccountOverview } from "../src/components/account/account-overview";

const user: AuthenticatedUser = {
  id: "a2050000-0000-4000-8000-000000000001", name: "João de Souza", email: "joao@exemplo.test", role: "USER",
};

function renderAccount(account = user) {
  return new JSDOM(renderToStaticMarkup(<AccountOverview user={account} />)).window.document;
}

test("conta apresenta nome, e-mail e perfil da sessão com semântica acessível", () => {
  const document = renderAccount();
  assert.equal(document.querySelectorAll("h1").length, 1);
  assert.equal(document.querySelector("h1")?.textContent, "Minha conta");
  assert.deepEqual(Array.from(document.querySelectorAll("dt"), (element) => element.textContent), ["Nome", "E-mail", "Perfil de acesso"]);
  assert.deepEqual(Array.from(document.querySelectorAll("dd"), (element) => element.textContent), [user.name, user.email, "Usuário"]);
  assert.ok(!document.body.textContent?.includes(user.id));
  for (const section of document.querySelectorAll("section")) {
    assert.ok(document.getElementById(section.getAttribute("aria-labelledby")!)?.textContent);
  }
});

test("USER e ADMIN têm catálogo e sessão, com atalho administrativo somente para ADMIN", () => {
  for (const role of ["USER", "ADMIN"] as const) {
    const document = renderAccount({ ...user, role });
    const navigation = document.querySelector('nav[aria-label="Ações da conta"]')!;
    assert.equal(navigation.querySelector('a[href="/properties"]')?.textContent?.trim(), "Explorar imóveis");
    assert.equal(navigation.querySelector('a[href="/login"]')?.textContent?.trim(), "Gerenciar sessão");
    assert.equal(navigation.querySelectorAll('a[href="/admin"]').length, role === "ADMIN" ? 1 : 0);
    assert.equal(document.querySelectorAll("dd")[2].textContent, role === "ADMIN" ? "Administrador" : "Usuário");
  }
});

test("seções futuras informam disponibilidade sem simular listas, contagens ou ações", () => {
  const document = renderAccount();
  for (const [id, title] of [["account-favorites-title", "Imóveis de interesse"], ["account-inquiries-title", "Consultas enviadas"]]) {
    const section = document.querySelector(`section[aria-labelledby="${id}"]`)!;
    assert.equal(section.querySelector("h2")?.textContent, title);
    assert.match(section.textContent!, /Em breve/);
    assert.equal(section.querySelectorAll("a, button, input, ul, ol").length, 0);
    assert.doesNotMatch(section.textContent!, /\b0\b|Nenhum imóvel|Nenhuma consulta|Etapa|API|PostgreSQL/);
  }
});

test("nome e e-mail longos são preservados e conteúdo fornecido pelo usuário é escapado", () => {
  const account = { ...user, name: '<script>alert("teste")</script>' + "Á".repeat(70), email: "m".repeat(64) + "@" + "exemplo.".repeat(20) + "test" };
  const document = renderAccount(account);
  const values = document.querySelectorAll("dd");
  assert.equal(values[0].textContent, account.name);
  assert.equal(values[1].textContent, account.email);
  assert.equal(document.querySelectorAll("script").length, 0);
});
