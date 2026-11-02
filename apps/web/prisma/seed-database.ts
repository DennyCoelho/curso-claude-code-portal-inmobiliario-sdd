import type { Prisma } from "../src/generated/prisma/client";

import { seedProperties } from "./seed-properties";

export async function seedDevelopmentData(transaction: Prisma.TransactionClient) {
  const featureNames = [
    ...new Set(seedProperties.flatMap((property) => property.features)),
  ];

  for (const name of featureNames) {
    await transaction.feature.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  for (const [index, property] of seedProperties.entries()) {
    const { features, ...data } = property;
    // Datas distintas e fixas facilitam conferir a ordenação dos exemplos.
    const createdAt = new Date(Date.UTC(2026, 9, index + 1, 12));

    await transaction.property.upsert({
      where: { id: property.id },
      create: {
        ...data,
        country: "BR",
        createdAt,
        updatedAt: createdAt,
        features: { connect: features.map((name) => ({ name })) },
      },
      // Preservar preços, publicação, características e demais edições locais.
      update: {},
    });
  }

  return { properties: seedProperties.length, features: featureNames.length };
}
