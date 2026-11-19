import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import type { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/lib/db/client";
import { createInquiryRepository } from "../src/repositories/inquiry-repository";
import { createInquiryService } from "../src/services/inquiry-service";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
after(() => database.$disconnect());
class RollbackTest extends Error {}
async function withRollback(work: (client: Prisma.TransactionClient) => Promise<void>) {
  try { await database.$transaction(async (client) => { await work(client); throw new RollbackTest(); }, { timeout: 30_000, maxWait: 10_000 }); }
  catch (error) { if (!(error instanceof RollbackTest)) throw error; }
}
const contactFor = (propertyId: string) => ({ requestId: randomUUID(), propertyId, name: "Maria Silva", email: `inquiry-${randomUUID()}@exemplo.test`, phone: "+5511912345678", message: "Gostaria de agendar uma visita." });

test("PostgreSQL persiste visitante/conta, mantém tentativa/data e isola histórico com paginação", async () => {
  await withRollback(async (client) => {
    const user = await client.user.create({ data: { name: "Consultas Teste", email: `${randomUUID()}@exemplo.test`, passwordHash: "teste" } });
    const property = await client.property.findFirstOrThrow({ where: { isPublished: true } });
    const repository = createInquiryRepository(client);
    const guest = contactFor(property.id); const contact = contactFor(property.id);
    await repository.save(guest, null);
    const saved = await repository.save(contact, user.id);
    assert.deepEqual(await repository.save(contact, user.id), saved);
    assert.equal(await client.inquiry.count({ where: { id: contact.requestId } }), 1);
    assert.equal((await client.inquiry.findUniqueOrThrow({ where: { id: guest.requestId } })).userId, null);
    for (const patch of [{ message: "Outra mensagem de consulta." }, { email: "outro@exemplo.test" }]) {
      await assert.rejects(repository.save({ ...contact, ...patch }, user.id), { status: 409 });
    }
    await assert.rejects(repository.save(contact, null), { status: 409 });
    const createdAt = new Date("2026-11-19T15:00:00Z");
    await client.inquiry.createMany({ data: Array.from({ length: 11 }, (_, index) => ({ id: randomUUID(), userId: user.id,
      propertyId: property.id, name: contact.name, email: contact.email, phone: contact.phone, message: `Mensagem de teste ${index}`, createdAt })) });
    const service = createInquiryService(repository);
    const first = await service.list(user.id); const last = await service.list(user.id, 99);
    assert.equal(first.items.length, 10); assert.equal(last.items.length, 2); assert.equal(first.total, 12); assert.equal(last.page, 2);
    assert.equal(new Set([...first.items, ...last.items].map((item) => item.id)).size, 12);
    assert.equal((await service.list(randomUUID())).total, 0);
    assert.doesNotMatch(JSON.stringify(first), /userId|passwordHash|phone|email/);
    await client.property.update({ where: { id: property.id }, data: { isPublished: false } });
    assert.ok((await service.list(user.id)).items.every((item) => item.property === null));
    for (const id of [property.id, randomUUID()]) await assert.rejects(repository.save(contactFor(id), null), { status: 404 });
    await client.user.delete({ where: { id: user.id } });
    assert.equal((await client.inquiry.findUniqueOrThrow({ where: { id: contact.requestId } })).userId, null);
  });
});

test("limite de novas consultas não impede repetir uma tentativa já registrada", async () => {
  await withRollback(async (client) => {
    const property = await client.property.findFirstOrThrow({ where: { isPublished: true } });
    const repository = createInquiryRepository(client); const first = contactFor(property.id);
    await repository.save(first, null);
    for (let index = 1; index < 10; index++) await repository.save({ ...first, requestId: randomUUID() }, null);
    await assert.rejects(repository.save({ ...first, requestId: randomUUID() }, null), { status: 429 });
    assert.equal((await repository.save(first, null)).id, first.requestId);
    assert.equal(await client.inquiry.count({ where: { email: first.email } }), 10);
  });
});

test("oito criações concorrentes com a mesma tentativa produzem um único registro", async () => {
  const property = await database.property.findFirstOrThrow({ where: { isPublished: true } });
  const contact = contactFor(property.id); const repository = createInquiryRepository();
  try {
    const results = await Promise.all(Array.from({ length: 8 }, () => repository.save(contact, null)));
    assert.equal(new Set(results.map((result) => result.id)).size, 1);
    assert.equal(new Set(results.map((result) => result.createdAt.toISOString())).size, 1);
    assert.equal(await database.inquiry.count({ where: { id: contact.requestId } }), 1);
  } finally {
    await database.inquiry.deleteMany({ where: { id: contact.requestId } });
    await database.authRateLimit.deleteMany({ where: { key: createHash("sha256").update(`inquiries:${contact.email}`).digest("hex") } });
  }
});
