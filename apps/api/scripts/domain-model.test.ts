import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";

import { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/lib/db/client";

nextEnv.loadEnvConfig(process.cwd());

const database = createDatabaseClient();

after(async () => {
  await database.$disconnect();
});

class RollbackTest extends Error {}

// Nenhum dado de teste é confirmado, mesmo se uma asserção falhar.
async function withRollback(
  check: (transaction: Prisma.TransactionClient) => Promise<void>,
) {
  try {
    await database.$transaction(
      async (transaction) => {
        await check(transaction);
        throw new RollbackTest();
      },
      { timeout: 15_000 },
    );
  } catch (error) {
    if (!(error instanceof RollbackTest)) throw error;
  }
}

function prismaError(code: string) {
  return (error: unknown) =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function checkViolation(constraint: string) {
  return (error: unknown) => {
    const details =
      error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : "";

    return details.includes(constraint) && details.includes("23514");
  };
}

function propertyData(
  overrides: Partial<Prisma.PropertyCreateInput> = {},
): Prisma.PropertyCreateInput {
  return {
    title: "Apartamento de teste no Centro",
    description: "Imóvel usado exclusivamente na validação do modelo.",
    operation: "SALE",
    type: "APARTMENT",
    price: "450000.10",
    usableArea: "72.50",
    totalArea: "95.75",
    bedrooms: 2,
    bathrooms: 1,
    parkingSpaces: 0,
    age: 5,
    address: "Praça da Sé",
    addressNumber: "s/n",
    neighborhood: "Sé",
    city: "São Paulo",
    state: "SP",
    postalCode: "01001000",
    ...overrides,
  };
}

function userData() {
  return {
    name: "Pessoa de teste",
    email: `teste-${randomUUID()}@example.com`,
    passwordHash: "hash-ficticio-exclusivo-do-teste",
  };
}

function inquiryData(propertyId: string, userId?: string) {
  return {
    propertyId,
    userId,
    name: "Contato de teste",
    email: "contato@example.com",
    phone: "+5511998765432",
    message: "Gostaria de saber mais sobre o imóvel.",
  };
}

test("persiste decimais exatos, CEP com zero inicial, país e padrões seguros", async () => {
  await withRollback(async (transaction) => {
    const property = await transaction.property.create({ data: propertyData() });
    const stored = await transaction.property.findUniqueOrThrow({
      where: { id: property.id },
    });

    assert.equal(stored.price.toFixed(2), "450000.10");
    assert.equal(stored.usableArea?.toFixed(2), "72.50");
    assert.equal(stored.totalArea?.toFixed(2), "95.75");
    assert.equal(stored.postalCode, "01001000");
    assert.equal(stored.addressNumber, "s/n");
    assert.equal(stored.addressComplement, null);
    assert.equal(stored.country, "BR");
    assert.equal(stored.isPublished, false);
    assert.equal(stored.isFeatured, false);
    assert.ok(stored.createdAt instanceof Date);
    assert.ok(stored.updatedAt instanceof Date);

    const rental = await transaction.property.create({
      data: propertyData({ operation: "RENT", price: "2500.99" }),
    });
    assert.equal(rental.operation, "RENT");
    assert.equal(rental.price.toFixed(2), "2500.99");
  });
});

test("permite campos não aplicáveis nulos em terrenos", async () => {
  await withRollback(async (transaction) => {
    const land = await transaction.property.create({
      data: propertyData({
        type: "LAND",
        usableArea: null,
        bedrooms: null,
        bathrooms: null,
        parkingSpaces: null,
        age: null,
      }),
    });

    assert.equal(land.type, "LAND");
    assert.equal(land.usableArea, null);
    assert.equal(land.bedrooms, null);
    assert.equal(land.age, null);
  });
});

test("cria usuários USER ativos por padrão e permite ADMIN e desativação", async () => {
  await withRollback(async (transaction) => {
    const user = await transaction.user.create({ data: userData() });
    assert.equal(user.role, "USER");
    assert.equal(user.isActive, true);

    const updated = await transaction.user.update({
      where: { id: user.id },
      data: { role: "ADMIN", isActive: false },
    });
    assert.equal(updated.role, "ADMIN");
    assert.equal(updated.isActive, false);
    assert.ok(updated.updatedAt >= user.updatedAt);
  });
});

test("rejeita e-mail e favorito duplicados", async () => {
  await assert.rejects(
    withRollback(async (transaction) => {
      const data = userData();
      await transaction.user.create({ data });
      await transaction.user.create({ data });
    }),
    prismaError("P2002"),
  );

  await assert.rejects(
    withRollback(async (transaction) => {
      const user = await transaction.user.create({ data: userData() });
      const property = await transaction.property.create({ data: propertyData() });
      const data = { userId: user.id, propertyId: property.id };
      await transaction.favorite.create({ data });
      await transaction.favorite.create({ data });
    }),
    prismaError("P2002"),
  );
});

test("compartilha características entre imóveis sem duplicar os vínculos", async () => {
  await withRollback(async (transaction) => {
    const feature = await transaction.feature.create({
      data: { name: `Piscina de teste ${randomUUID()}` },
    });
    const first = await transaction.property.create({
      data: propertyData({ features: { connect: { id: feature.id } } }),
    });
    await transaction.property.create({
      data: propertyData({ features: { connect: { id: feature.id } } }),
    });
    const updated = await transaction.property.update({
      where: { id: first.id },
      data: { features: { connect: { id: feature.id } } },
      include: { features: true },
    });

    assert.equal(updated.features.length, 1);
    assert.equal(
      await transaction.property.count({
        where: { features: { some: { id: feature.id } } },
      }),
      2,
    );

    await transaction.feature.delete({ where: { id: feature.id } });
    assert.ok(await transaction.property.findUnique({ where: { id: first.id } }));
  });

  await assert.rejects(
    withRollback(async (transaction) => {
      const name = `Característica de teste ${randomUUID()}`;
      await transaction.feature.create({ data: { name } });
      await transaction.feature.create({ data: { name } });
    }),
    prismaError("P2002"),
  );
});

test("aceita consultas de visitantes e preserva o contato ao excluir o usuário", async () => {
  await withRollback(async (transaction) => {
    const user = await transaction.user.create({ data: userData() });
    const property = await transaction.property.create({ data: propertyData() });
    const guest = await transaction.inquiry.create({
      data: inquiryData(property.id),
    });
    assert.equal(guest.userId, null);

    const inquiry = await transaction.inquiry.create({
      data: inquiryData(property.id, user.id),
    });
    await transaction.favorite.create({
      data: { userId: user.id, propertyId: property.id },
    });
    await transaction.user.delete({ where: { id: user.id } });

    const stored = await transaction.inquiry.findUniqueOrThrow({
      where: { id: inquiry.id },
    });
    assert.equal(stored.userId, null);
    assert.equal(stored.propertyId, property.id);
    assert.equal(stored.phone, "+5511998765432");
    assert.equal(
      await transaction.favorite.count({ where: { userId: user.id } }),
      0,
    );
  });
});

test("ordena imagens e impede duas principais ou publicId duplicado", async () => {
  await withRollback(async (transaction) => {
    const property = await transaction.property.create({ data: propertyData() });
    await transaction.propertyImage.createMany({
      data: [
        {
          propertyId: property.id,
          url: "https://res.cloudinary.com/teste/image/upload/segunda.jpg",
          publicId: randomUUID(),
          position: 2,
        },
        {
          propertyId: property.id,
          url: "https://res.cloudinary.com/teste/image/upload/principal.jpg",
          publicId: randomUUID(),
          position: 0,
          isMain: true,
        },
        {
          propertyId: property.id,
          url: "https://res.cloudinary.com/teste/image/upload/primeira.jpg",
          publicId: randomUUID(),
          position: 1,
        },
      ],
    });
    const images = await transaction.propertyImage.findMany({
      where: { propertyId: property.id },
      orderBy: { position: "asc" },
    });
    assert.deepEqual(
      images.map((image) => image.position),
      [0, 1, 2],
    );
    assert.equal(images[0].isMain, true);
  });

  for (const duplicateMain of [true, false]) {
    await assert.rejects(
      withRollback(async (transaction) => {
        const property = await transaction.property.create({ data: propertyData() });
        const data = {
          propertyId: property.id,
          url: "https://res.cloudinary.com/teste/image/upload/teste.jpg",
          publicId: randomUUID(),
          isMain: true,
        };
        await transaction.propertyImage.create({ data });
        await transaction.propertyImage.create({
          data: {
            ...data,
            publicId: duplicateMain ? randomUUID() : data.publicId,
            isMain: duplicateMain,
          },
        });
      }),
      prismaError("P2002"),
    );
  }
});

test("exclui dependências do imóvel e preserva usuários e características", async () => {
  await withRollback(async (transaction) => {
    const user = await transaction.user.create({ data: userData() });
    const feature = await transaction.feature.create({
      data: { name: `Jardim de teste ${randomUUID()}` },
    });
    const property = await transaction.property.create({
      data: propertyData({ features: { connect: { id: feature.id } } }),
    });
    await transaction.propertyImage.create({
      data: {
        propertyId: property.id,
        url: "https://res.cloudinary.com/teste/image/upload/teste.jpg",
        publicId: randomUUID(),
      },
    });
    await transaction.favorite.create({
      data: { userId: user.id, propertyId: property.id },
    });
    await transaction.inquiry.create({ data: inquiryData(property.id, user.id) });
    await transaction.property.delete({ where: { id: property.id } });

    assert.equal(
      await transaction.propertyImage.count({ where: { propertyId: property.id } }),
      0,
    );
    assert.equal(
      await transaction.favorite.count({ where: { propertyId: property.id } }),
      0,
    );
    assert.equal(
      await transaction.inquiry.count({ where: { propertyId: property.id } }),
      0,
    );
    assert.ok(await transaction.user.findUnique({ where: { id: user.id } }));
    assert.ok(await transaction.feature.findUnique({ where: { id: feature.id } }));
  });
});

test("rejeita referências a imóveis e usuários inexistentes", async () => {
  const invalidRelations = [
    async (transaction: Prisma.TransactionClient) => {
      await transaction.inquiry.create({ data: inquiryData(randomUUID()) });
    },
    async (transaction: Prisma.TransactionClient) => {
      const property = await transaction.property.create({ data: propertyData() });
      await transaction.favorite.create({
        data: { userId: randomUUID(), propertyId: property.id },
      });
    },
    async (transaction: Prisma.TransactionClient) => {
      await transaction.propertyImage.create({
        data: {
          propertyId: randomUUID(),
          url: "https://res.cloudinary.com/teste/image/upload/teste.jpg",
          publicId: randomUUID(),
        },
      });
    },
  ];

  for (const check of invalidRelations) {
    await assert.rejects(withRollback(check), prismaError("P2003"));
  }
});

test("o PostgreSQL rejeita UF, CEP, país, preço, áreas e contagens inválidos", async () => {
  const invalidProperties: [Partial<Prisma.PropertyCreateInput>, string][] = [
    [{ state: "sp" }, "Property_state_brazilian"],
    [{ state: "XX" }, "Property_state_brazilian"],
    [{ postalCode: "0100100" }, "Property_postalCode_digits"],
    [{ postalCode: "01001A00" }, "Property_postalCode_digits"],
    [{ country: "US" }, "Property_country_brazil"],
    [{ price: "-1.00" }, "Property_price_positive"],
    [{ price: "0.00" }, "Property_price_positive"],
    [{ usableArea: "-1.00" }, "Property_areas_positive"],
    [{ totalArea: "0.00" }, "Property_areas_positive"],
    [{ bedrooms: -1 }, "Property_counts_nonnegative"],
    [{ bathrooms: -1 }, "Property_counts_nonnegative"],
    [{ parkingSpaces: -1 }, "Property_counts_nonnegative"],
    [{ age: -1 }, "Property_counts_nonnegative"],
  ];

  for (const [overrides, constraint] of invalidProperties) {
    await assert.rejects(
      withRollback(async (transaction) => {
        await transaction.property.create({ data: propertyData(overrides) });
      }),
      checkViolation(constraint),
    );
  }
});

test("o PostgreSQL rejeita posição negativa de imagem e telefone sem +55", async () => {
  await assert.rejects(
    withRollback(async (transaction) => {
      const property = await transaction.property.create({ data: propertyData() });
      await transaction.propertyImage.create({
        data: {
          propertyId: property.id,
          url: "https://res.cloudinary.com/teste/image/upload/teste.jpg",
          publicId: randomUUID(),
          position: -1,
        },
      });
    }),
    checkViolation("PropertyImage_position_nonnegative"),
  );

  await assert.rejects(
    withRollback(async (transaction) => {
      const property = await transaction.property.create({ data: propertyData() });
      await transaction.inquiry.create({
        data: { ...inquiryData(property.id), phone: "11998765432" },
      });
    }),
    checkViolation("Inquiry_phone_international"),
  );
});
