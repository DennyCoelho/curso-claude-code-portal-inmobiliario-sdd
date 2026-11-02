import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { Prisma } from "../src/generated/prisma/client";
import { seedProperties } from "../prisma/seed-properties";

test("os exemplos cobrem os quatro tipos em venda e aluguel e diferentes localidades brasileiras", () => {
  for (const type of ["HOUSE", "APARTMENT", "LAND", "OFFICE"]) {
    for (const operation of ["SALE", "RENT"]) {
      assert.ok(
        seedProperties.some(
          (property) => property.type === type && property.operation === operation,
        ),
      );
    }
  }

  assert.ok(new Set(seedProperties.map((property) => property.city)).size >= 5);
  assert.ok(new Set(seedProperties.map((property) => property.state)).size >= 5);
  assert.ok(
    seedProperties.some((property) => property.postalCode.startsWith("0")),
  );
  assert.ok(seedProperties.some((property) => property.addressNumber === "s/n"));
  assert.ok(seedProperties.some((property) => property.isPublished));
  assert.ok(seedProperties.some((property) => !property.isPublished));
  assert.ok(seedProperties.some((property) => property.isFeatured));
  assert.ok(
    seedProperties.every((property) => !property.isFeatured || property.isPublished),
  );
  assert.equal(
    new Set(seedProperties.map((property) => property.id)).size,
    seedProperties.length,
  );
});

test("preços decimais, endereços e campos opcionais são coerentes com os imóveis", () => {
  const states = new Set([
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
  ]);

  for (const property of seedProperties) {
    assert.match(
      property.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    assert.equal(typeof property.price, "string");
    assert.match(String(property.price), /^\d+\.\d{2}$/);
    assert.ok(new Prisma.Decimal(property.price).greaterThan(0));
    assert.ok(states.has(property.state));
    assert.match(property.postalCode, /^\d{8}$/);
    assert.ok(
      property.address && property.addressNumber && property.neighborhood && property.city,
    );
    assert.ok(property.features.length > 0);
    assert.equal(new Set(property.features).size, property.features.length);

    const totalArea = new Prisma.Decimal(property.totalArea);
    assert.ok(totalArea.greaterThan(0));
    if (property.usableArea != null) {
      assert.ok(new Prisma.Decimal(property.usableArea).greaterThan(0));
      assert.ok(totalArea.greaterThanOrEqualTo(property.usableArea));
    }

    if (property.type === "LAND") {
      for (const field of [
        "usableArea", "bedrooms", "bathrooms", "parkingSpaces", "age",
      ] as const) {
        assert.equal(property[field], null);
      }
    }

    if (property.operation === "RENT") {
      assert.match(property.description, /mensal/);
    }
  }
});

test("o comando recusa produção antes de tentar conectar ao banco", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "prisma/seed.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://invalido",
      },
      encoding: "utf8",
      timeout: 10_000,
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /não pode ser executado em produção/);
  assert.doesNotMatch(result.stderr, /DATABASE_URL/);
});
