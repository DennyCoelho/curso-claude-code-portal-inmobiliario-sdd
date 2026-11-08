import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";

import { seedProperties } from "../prisma/seed-properties";
import type { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/lib/db/client";
import { createPublicPropertyRepository } from "../src/repositories/public-property-repository";
import { createPublicPropertyService } from "../src/services/public-property-service";
import type { PublicPropertyFilters } from "@portal-inmobiliario/contracts/public-property";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(async () => {
  await database.$disconnect();
});

class RollbackTest extends Error {}

async function withRollback(
  check: (transaction: Prisma.TransactionClient) => Promise<void>,
) {
  try {
    await database.$transaction(async (transaction) => {
      await check(transaction);
      throw new RollbackTest();
    }, { timeout: 15_000 });
  } catch (error) {
    if (!(error instanceof RollbackTest)) throw error;
  }
}

test("as consultas públicas excluem rascunhos, mesmo em destaque, e refletem despublicações", async () => {
  await withRollback(async (transaction) => {
    const { features: seedFeatures, ...propertyData } = seedProperties[0];
    assert.ok(seedFeatures.length > 0);
    const published = await transaction.property.create({
      data: {
        ...propertyData, id: randomUUID(), isPublished: true, country: "BR",
      },
    });
    const draft = await transaction.property.create({
      data: {
        ...propertyData,
        id: randomUUID(),
        isPublished: false,
        isFeatured: true,
        country: "BR",
      },
    });
    const repository = createPublicPropertyRepository(transaction);
    const service = createPublicPropertyService(repository);
    const list = await service.list();
    assert.ok(list.some((property) => property.id === published.id));
    assert.ok(list.every((property) => property.id !== draft.id));

    const publishedIds = await transaction.property.findMany({
      where: { isPublished: true }, select: { id: true },
    });
    assert.deepEqual(
      list.map((property) => property.id).sort(),
      publishedIds.map((property) => property.id).sort(),
    );
    assert.equal(await service.findById(draft.id), null);
    assert.equal(await service.findById(randomUUID()), null);
    assert.equal((await service.findById(published.id))?.id, published.id);

    await transaction.property.update({
      where: { id: published.id }, data: { isPublished: false },
    });
    assert.equal(await service.findById(published.id), null);
    assert.ok((await service.list()).every((property) => property.id !== published.id));
  });
});

test("o contrato público preserva dados brasileiros e relações ordenadas sem expor dados de gestão ou contato", async () => {
  await withRollback(async (transaction) => {
    const { features: seedFeatures, ...propertyData } = seedProperties[0];
    const uniqueSuffix = randomUUID();
    const stored = await transaction.property.create({
      data: {
        ...propertyData,
        id: randomUUID(),
        isPublished: true,
        operation: "RENT",
        price: "2500.10",
        usableArea: "72.50",
        postalCode: "01001000",
        addressComplement: null,
        country: "BR",
        images: {
          create: [
            {
              url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
              publicId: `teste-segunda-${uniqueSuffix}`,
              position: 2,
            },
            {
              url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
              publicId: `teste-principal-${uniqueSuffix}`,
              position: 0,
              isMain: true,
            },
          ],
        },
        features: {
          create: seedFeatures.slice(0, 2).map((name) => ({
            name: `${name} ${uniqueSuffix}`,
          })),
        },
        inquiries: {
          create: {
            name: "Contato privado",
            email: "privado@example.com",
            phone: "+5511998765432",
            message: "Mensagem privada de teste",
          },
        },
      },
    });
    const service = createPublicPropertyService(
      createPublicPropertyRepository(transaction),
    );
    const detail = (await service.findById(stored.id))!;
    assert.deepEqual(
      (await service.list()).find((property) => property.id === stored.id), detail,
    );
    assert.equal(detail.price, "2500.10");
    assert.equal(detail.usableArea, "72.50");
    assert.equal(detail.postalCode, "01001000");
    assert.equal(detail.country, "BR");
    assert.equal(detail.operation, "RENT");
    assert.equal(detail.createdAt, stored.createdAt.toISOString());
    assert.equal(detail.addressComplement, null);
    assert.deepEqual(detail.images.map((image) => image.position), [0, 2]);
    assert.equal(detail.images[0].isMain, true);
    assert.deepEqual(
      detail.features.map((feature) => feature.name),
      detail.features.map((feature) => feature.name)
        .sort((first, second) => first.localeCompare(second, "pt-BR")),
    );
    for (const field of ["isPublished", "inquiries", "favorites", "passwordHash"]) {
      assert.equal(field in detail, false);
    }
    for (const image of detail.images) {
      assert.deepEqual(Object.keys(image).sort(), ["id", "isMain", "position", "url"]);
    }
    assert.doesNotMatch(
      JSON.stringify(detail), /privado@example\.com|Mensagem privada|teste-principal/,
    );
  });
});

test("a busca consulta os cinco campos no PostgreSQL sem distinguir maiúsculas e exclui rascunhos", async () => {
  await withRollback(async (transaction) => {
    const { features: seedFeatures, ...propertyData } = seedProperties[0];
    assert.ok(seedFeatures.length > 0);
    const marker = `Busca-${randomUUID()}`;
    const base = {
      ...propertyData,
      title: "Imóvel para teste",
      description: "Descrição neutra",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      country: "BR",
      isPublished: true,
      createdAt: new Date("2026-11-01T12:00:00Z"),
    };
    const fields = ["title", "neighborhood", "city", "description"] as const;
    const records = [];
    for (const field of fields) {
      records.push(await transaction.property.create({
        data: { ...base, id: randomUUID(), [field]: `${marker}-${field} São José` },
      }));
    }
    const draft = await transaction.property.create({
      data: { ...base, id: randomUUID(), title: marker, isPublished: false },
    });
    const stateRecord = await transaction.property.create({
      data: { ...base, id: randomUUID(), state: "AP" },
    });
    const service = createPublicPropertyService(createPublicPropertyRepository(transaction));
    for (const [index, field] of fields.entries()) {
      const results = await service.list(`${marker}-${field}`.toUpperCase());
      assert.deepEqual(results.map(({ id }) => id), [records[index].id], field);
    }
    const results = await service.list(marker.toLowerCase());
    assert.deepEqual(results.map(({ id }) => id), records.map(({ id }) => id).sort());
    assert.ok(results.every(({ id }) => id !== draft.id));
    const stateResults = await service.list("ap");
    assert.ok(stateResults.some(({ id }) => id === stateRecord.id));
    const all = await service.list();
    assert.deepEqual(
      stateResults.map(({ id }) => id),
      all.filter((property) => [property.title, property.neighborhood, property.city, property.state, property.description]
        .some((value) => value.toLowerCase().includes("ap"))).map(({ id }) => id),
    );
    const accented = await service.list(`${marker}-title São José`);
    assert.deepEqual(accented.map(({ id }) => id), [records[0].id]);
    assert.deepEqual(await service.list(`ausente-${randomUUID()}`), []);
    assert.deepEqual(await service.list("' OR 1=1--"), []);
    assert.deepEqual(await service.list(""), all);
  });
});

test("a busca trata porcentagem, sublinhado e barra invertida como caracteres literais", async () => {
  await withRollback(async (transaction) => {
    const { features: seedFeatures, ...propertyData } = seedProperties[0];
    assert.ok(seedFeatures.length > 0);
    const marker = randomUUID();
    const literal = await transaction.property.create({
      data: { ...propertyData, id: randomUUID(), title: `${marker} 100%_\\ varanda`, isPublished: true, country: "BR" },
    });
    await transaction.property.create({
      data: { ...propertyData, id: randomUUID(), title: `${marker} 100AB varanda`, isPublished: true, country: "BR" },
    });
    const service = createPublicPropertyService(createPublicPropertyRepository(transaction));
    for (const term of [`${marker} 100%`, `${marker} 100%_`, `${marker} 100%_\\`]) {
      assert.deepEqual((await service.list(term)).map(({ id }) => id), [literal.id]);
    }
  });
});

test("o PostgreSQL aplica cada filtro, limites inclusivos, valores nulos e combinações com busca e publicação", async () => {
  await withRollback(async (transaction) => {
    const { features: seedFeatures, ...propertyData } = seedProperties[0];
    assert.ok(seedFeatures.length > 0);
    const marker = `Filtros-${randomUUID()}`;
    const base = {
      ...propertyData, title: marker, country: "BR", isPublished: true,
      operation: "SALE" as const, type: "HOUSE" as const, price: "100.10", usableArea: "85.50",
      bedrooms: 3, bathrooms: 2, neighborhood: "Centro%_\\", city: "São José%_\\", state: "SP",
      createdAt: new Date("2026-11-01T12:00:00Z"),
    };
    const first = await transaction.property.create({ data: { ...base, id: randomUUID() } });
    const second = await transaction.property.create({ data: { ...base, id: randomUUID(), price: "100.11", usableArea: "90.00", bedrooms: 4, bathrooms: 3, neighborhood: "CentroAB", city: "SÃO JOSÉAB" } });
    const rent = await transaction.property.create({ data: { ...base, id: randomUUID(), operation: "RENT", type: "APARTMENT", price: "100.09", usableArea: "70.00", bedrooms: 1, bathrooms: 1, city: "Recife", state: "PE", neighborhood: "Boa Viagem" } });
    const land = await transaction.property.create({ data: { ...base, id: randomUUID(), type: "LAND", price: "999999999999.99", usableArea: null, bedrooms: null, bathrooms: null, city: "Recife", state: "PE", neighborhood: "Centro" } });
    await transaction.property.create({ data: { ...base, id: randomUUID(), isPublished: false } });
    const service = createPublicPropertyService(createPublicPropertyRepository(transaction));
    const cases: [PublicPropertyFilters, string[]][] = [
      [{ operation: "SALE" }, [first.id, second.id, land.id]],
      [{ operation: "RENT" }, [rent.id]],
      [{ type: ["HOUSE"] }, [first.id, second.id]],
      [{ type: ["LAND"] }, [land.id]],
      [{ type: ["HOUSE", "APARTMENT"] }, [first.id, second.id, rent.id]],
      [{ type: ["COMMERCIAL"] }, []],
      [{ minPrice: "100.10" }, [first.id, second.id, land.id]],
      [{ maxPrice: "100.10" }, [first.id, rent.id]],
      [{ minPrice: "100.10", maxPrice: "100.10" }, [first.id]],
      [{ minPrice: "999999999999.99", maxPrice: "999999999999.99" }, [land.id]],
      [{ bedrooms: 3 }, [first.id]],
      [{ bedrooms: "4+" }, [second.id]],
      [{ bedrooms: 1 }, [rent.id]],
      [{ bathrooms: 3 }, [second.id]],
      [{ bathrooms: 1 }, [rent.id]],
      [{ bathrooms: 2 }, [first.id]],
      [{ bathrooms: "4+" }, []],
      [{ minUsableArea: "85.50" }, [first.id, second.id]],
      [{ minUsableArea: "0.00" }, [first.id, second.id, rent.id]],
      [{ neighborhood: "centro" }, [first.id, second.id, land.id]],
      [{ neighborhood: "%_\\" }, [first.id]],
      [{ city: "são josé" }, [first.id, second.id]],
      [{ city: "%_\\" }, [first.id]],
      [{ state: "SP" }, [first.id, second.id]],
      [{ state: "PE" }, [rent.id, land.id]],
      [{ operation: "SALE", type: ["HOUSE", "APARTMENT"], minPrice: "100.10", maxPrice: "100.10", bedrooms: 3, bathrooms: 2, minUsableArea: "85.50", neighborhood: "centro%", city: "são josé%", state: "SP" }, [first.id]],
      [{ operation: "RENT", type: ["LAND"] }, []],
    ];
    for (const [filters, expected] of cases) {
      const results = await service.list(marker, filters);
      assert.deepEqual(results.map(({ id }) => id), expected.toSorted(), JSON.stringify(filters));
      assert.ok(results.every(({ price }) => /^\d+\.\d{2}$/.test(price)));
    }
    await transaction.property.update({ where: { id: second.id }, data: { bedrooms: 5, bathrooms: 4 } });
    assert.deepEqual((await service.list(marker, { bedrooms: "4+" })).map(({ id }) => id), [second.id]);
    assert.deepEqual((await service.list(marker, { bathrooms: "4+" })).map(({ id }) => id), [second.id]);
    await transaction.property.update({ where: { id: second.id }, data: { bathrooms: 5 } });
    assert.deepEqual((await service.list(marker, { bedrooms: "4+", bathrooms: "4+" })).map(({ id }) => id), [second.id]);
  });
});

test("a faixa de preços agrega somente publicados e separa venda de aluguel com precisão", async () => {
  await withRollback(async (transaction) => {
    const { features: seedFeatures, ...propertyData } = seedProperties[0];
    assert.ok(seedFeatures.length > 0);
    for (const [operation, prices] of [["SALE", ["0.01", "999999999999.99"]], ["RENT", ["0.02", "999999999999.98"]]] as const) {
      for (const price of prices) await transaction.property.create({ data: { ...propertyData, id: randomUUID(), operation, price, country: "BR", isPublished: true } });
    }
    for (const price of ["0.01", "999999999999.99"]) await transaction.property.create({ data: { ...propertyData, id: randomUUID(), operation: "RENT", price, country: "BR", isPublished: false } });
    const service = createPublicPropertyService(createPublicPropertyRepository(transaction));
    assert.deepEqual(await service.priceRange(), { minPrice: "0.01", maxPrice: "999999999999.99" });
    assert.deepEqual(await service.priceRange("SALE"), { minPrice: "0.01", maxPrice: "999999999999.99" });
    assert.deepEqual(await service.priceRange("RENT"), { minPrice: "0.02", maxPrice: "999999999999.98" });
    await transaction.property.updateMany({ where: { operation: "RENT" }, data: { isPublished: false } });
    assert.deepEqual(await service.priceRange("RENT"), { minPrice: null, maxPrice: null });
  });
});
