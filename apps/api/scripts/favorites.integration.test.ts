import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import type { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/lib/db/client";
import { createFavoriteRepository } from "../src/repositories/favorite-repository";
import { createFavoriteService } from "../src/services/favorite-service";
import { favoriteQuerySchema } from "@portal-inmobiliario/contracts/favorites";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(() => database.$disconnect());
class RollbackTest extends Error {}
async function withRollback(work: (client: Prisma.TransactionClient) => Promise<void>) {
  try { await database.$transaction(async (client) => { await work(client); throw new RollbackTest(); }, { timeout: 30_000 }); }
  catch (error) { if (!(error instanceof RollbackTest)) throw error; }
}
const userData = () => ({ name: "Favoritos Teste", email: `favorites-${randomUUID()}@example.com`, passwordHash: "hash-exclusivo-do-teste" });

test("PostgreSQL isola usuários, serializa dados públicos e mantém data/registro em adições repetidas", async () => {
  await withRollback(async (client) => {
    const first = await client.user.create({ data: userData() }); const second = await client.user.create({ data: userData() });
    const property = await client.property.findFirstOrThrow({ where: { isPublished: true } });
    const service = createFavoriteService(createFavoriteRepository(client));
    assert.deepEqual((await service.list(first.id)).items, []);
    await service.add(first.id, property.id); const saved = await client.favorite.findFirstOrThrow({ where: { userId: first.id } });
    await service.add(first.id, property.id.toUpperCase());
    assert.equal(await client.favorite.count({ where: { userId: first.id } }), 1);
    assert.deepEqual(await client.favorite.findUnique({ where: { id: saved.id } }), saved);
    assert.deepEqual((await service.list(second.id)).items, []);
    const list = (await service.list(first.id)).items; assert.equal(list.length, 1); assert.equal(list[0].id, property.id);
    assert.equal(list[0].price, property.price.toFixed(2)); assert.equal(typeof list[0].createdAt, "string");
    assert.doesNotMatch(JSON.stringify(list), /passwordHash|publicId|userId|isPublished/);
    await service.remove(second.id, property.id); assert.equal((await service.list(first.id)).items.length, 1);
    await service.add(second.id, property.id); await service.remove(first.id, property.id); await service.remove(first.id, property.id);
    assert.equal((await service.list(first.id)).items.length, 0); assert.equal((await service.list(second.id)).items.length, 1);
  });
});

test("despublicados/inexistentes não podem ser adicionados; favoritos ocultos podem ser removidos", async () => {
  await withRollback(async (client) => {
    const user = await client.user.create({ data: userData() });
    const property = await client.property.findFirstOrThrow({ where: { isPublished: true } });
    const service = createFavoriteService(createFavoriteRepository(client));
    await service.add(user.id, property.id);
    await client.property.update({ where: { id: property.id }, data: { isPublished: false } });
    assert.deepEqual((await service.list(user.id)).items, []);
    for (const id of [property.id, randomUUID()]) await assert.rejects(service.add(user.id, id), { status: 404 });
    await service.remove(user.id, property.id); assert.equal(await client.favorite.count({ where: { userId: user.id } }), 0);
  });
});

test("PostgreSQL pagina 9/9/5, aplica filtros antes da contagem e corrige última página após remover", async () => {
  await withRollback(async (client) => {
    const user = await client.user.create({ data: userData() });
    const other = await client.user.create({ data: userData() });
    const template = await client.property.findFirstOrThrow();
    const properties = Array.from({ length: 24 }, (_, index) => ({ ...template, id: randomUUID(),
      title: index === 0 ? "Oferta literal 100%_ na Sé" : `Favorito ${index}`, price: `${1000 + index}.00`,
      operation: index % 3 === 0 ? "RENT" as const : "SALE" as const, type: index % 2 === 0 ? "APARTMENT" as const : "HOUSE" as const, isPublished: index < 23 }));
    await client.property.createMany({ data: properties });
    await client.favorite.createMany({ data: properties.map((property, index) => ({ userId: user.id, propertyId: property.id, createdAt: new Date(1_000_000 + index * 1000) })) });
    await client.favorite.create({ data: { userId: other.id, propertyId: properties[0].id } });
    const service = createFavoriteService(createFavoriteRepository(client));
    const pages = await Promise.all([1, 2, 3].map((page) => service.list(user.id, favoriteQuerySchema.parse({ page }))));
    assert.deepEqual(pages.map((page) => page.items.length), [9, 9, 5]);
    assert.ok(pages.every((page) => page.total === 23 && page.totalPages === 3 && page.pageSize === 9));
    assert.deepEqual(pages.flatMap((page) => page.items.map((property) => property.id)), properties.slice(0, 23).toReversed().map((property) => property.id));
    assert.equal(new Set(pages.flatMap((page) => page.items.map((property) => property.id))).size, 23);
    const filtered = await service.list(user.id, favoriteQuerySchema.parse({ operation: "RENT", type: "APARTMENT", sort: "price_asc" }));
    const expected = properties.slice(0, 23).filter((property) => property.operation === "RENT" && property.type === "APARTMENT");
    assert.equal(filtered.total, expected.length); assert.deepEqual(filtered.items.map((property) => property.id), expected.map((property) => property.id));
    const literal = await service.list(user.id, favoriteQuerySchema.parse({ search: "%_" }));
    assert.equal(literal.total, 1); assert.equal(literal.items[0].id, properties[0].id);
    assert.equal((await service.list(other.id)).total, 1);
    assert.equal((await service.ids(user.id)).length, 23);
    assert.equal((await service.list(user.id, favoriteQuerySchema.parse({ search: "nenhum-resultado" }))).totalPages, 0);
    const oldest = await service.list(user.id, favoriteQuerySchema.parse({ sort: "saved_asc" })); assert.equal(oldest.items[0].id, properties[0].id);
    const expensive = await service.list(user.id, favoriteQuerySchema.parse({ sort: "price_desc" })); assert.equal(expensive.items[0].id, properties[22].id);
    for (const property of properties.slice(0, 5)) await service.remove(user.id, property.id);
    const last = await service.list(user.id, favoriteQuerySchema.parse({ page: 3 }));
    assert.equal(last.page, 2); assert.equal(last.total, 18); assert.equal(last.items.length, 9);
  });
});

test("adições simultâneas mantêm somente um favorito por usuário/imóvel", async () => {
  const user = await database.user.create({ data: userData() });
  try {
    const property = await database.property.findFirstOrThrow({ where: { isPublished: true } });
    const repository = createFavoriteRepository(database);
    assert.deepEqual(await Promise.all(Array.from({ length: 8 }, () => repository.add(user.id, property.id))), Array(8).fill(true));
    assert.equal(await database.favorite.count({ where: { userId: user.id, propertyId: property.id } }), 1);
  } finally { await database.user.delete({ where: { id: user.id } }); }
});
