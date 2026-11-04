import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";

import { seedDevelopmentData } from "../prisma/seed-database";
import { seedProperties } from "../prisma/seed-properties";
import { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/lib/db/client";

nextEnv.loadEnvConfig(process.cwd());

const database = createDatabaseClient();
const propertyIds = seedProperties.map((property) => property.id);
const featureNames = [
  ...new Set(seedProperties.flatMap((property) => property.features)),
];

after(async () => {
  await database.$disconnect();
});

class RollbackTest extends Error {}

async function withRollback(
  check: (transaction: Prisma.TransactionClient) => Promise<void>,
) {
  try {
    await database.$transaction(
      async (transaction) => {
        // Isolar os exemplos; até exclusões e cascatas são revertidas ao final.
        await transaction.property.deleteMany({
          where: { id: { in: propertyIds } },
        });
        await check(transaction);
        throw new RollbackTest();
      },
      { timeout: 30_000 },
    );
  } catch (error) {
    if (!(error instanceof RollbackTest)) throw error;
  }
}

test("o seed persiste imóveis, decimais, estados de publicação e características compartilhadas", async () => {
  await withRollback(async (transaction) => {
    const result = await seedDevelopmentData(transaction);
    assert.deepEqual(result, {
      properties: seedProperties.length,
      features: featureNames.length,
    });

    const properties = await transaction.property.findMany({
      where: { id: { in: propertyIds } },
      include: { features: { orderBy: { name: "asc" } } },
      orderBy: { id: "asc" },
    });
    assert.equal(properties.length, seedProperties.length);

    for (const expected of seedProperties) {
      const stored = properties.find((property) => property.id === expected.id)!;
      assert.equal(stored.title, expected.title);
      assert.equal(stored.price.toFixed(2), String(expected.price));
      assert.equal(stored.usableArea?.toFixed(2) ?? null, expected.usableArea);
      assert.equal(stored.totalArea?.toFixed(2), expected.totalArea);
      assert.equal(stored.country, "BR");
      assert.equal(stored.state, expected.state);
      assert.equal(stored.postalCode, expected.postalCode);
      assert.equal(stored.operation, expected.operation);
      assert.equal(stored.type, expected.type);
      assert.equal(stored.isPublished, expected.isPublished);
      assert.equal(stored.isFeatured, expected.isFeatured);
      assert.deepEqual(
        stored.features.map((feature) => feature.name).sort(),
        [...expected.features].sort(),
      );
    }

    assert.equal(properties.filter((property) => property.isPublished).length, 14);
    assert.equal(properties.filter((property) => property.isFeatured).length, 6);
    assert.equal(
      new Set(properties.map((property) => property.createdAt.toISOString())).size,
      properties.length,
    );
    assert.equal(
      await transaction.feature.count({ where: { name: { in: featureNames } } }),
      featureNames.length,
    );
    const elevators = properties.flatMap((property) =>
      property.features.filter((feature) => feature.name === "Elevador"),
    );
    assert.ok(elevators.length > 1);
    assert.equal(new Set(elevators.map((feature) => feature.id)).size, 1);
  });
});

test("reexecutar o seed mantém IDs, datas, edições e registros independentes sem duplicar vínculos", async () => {
  await withRollback(async (transaction) => {
    const existingFeature = await transaction.feature.upsert({
      where: { name: "Elevador" },
      create: { name: "Elevador" },
      update: {},
    });
    const { features: originalFeatures, ...independentData } = seedProperties[0];
    const independent = await transaction.property.create({
      data: { ...independentData, id: randomUUID(), country: "BR" },
    });
    await seedDevelopmentData(transaction);

    const snapshot = () =>
      transaction.property.findMany({
        where: { id: { in: propertyIds } },
        include: { features: { orderBy: { name: "asc" } } },
        orderBy: { id: "asc" },
      });
    const firstRun = await snapshot();
    const featureCount = await transaction.feature.count();
    await seedDevelopmentData(transaction);
    assert.deepEqual(await snapshot(), firstRun);
    assert.equal(await transaction.feature.count(), featureCount);

    const edited = await transaction.property.update({
      where: { id: propertyIds[0] },
      data: {
        title: "Título alterado no desenvolvimento",
        price: "900000.99",
        isPublished: false,
        isFeatured: false,
        features: { set: [] },
      },
      include: { features: true },
    });
    await seedDevelopmentData(transaction);
    assert.deepEqual(
      await transaction.property.findUniqueOrThrow({
        where: { id: edited.id },
        include: { features: true },
      }),
      edited,
    );
    assert.deepEqual(
      await transaction.property.findUniqueOrThrow({ where: { id: independent.id } }),
      independent,
    );
    assert.equal(
      await transaction.property.count({ where: { id: { in: propertyIds } } }),
      seedProperties.length,
    );
    assert.equal(await transaction.feature.count(), featureCount);
    const elevator = await transaction.feature.findUniqueOrThrow({
      where: { name: "Elevador" },
    });
    assert.equal(elevator.id, existingFeature.id);
    assert.ok(originalFeatures.includes(elevator.name));
  });
});
