import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { after, test } from "node:test";
import nextEnv from "@next/env";
import { preparedInquirySchema } from "@portal-inmobiliario/contracts/inquiries";
import { createDatabaseClient } from "../src/lib/db/client";
import { newSession } from "../src/lib/auth/session";

nextEnv.loadEnvConfig(process.cwd());
const database = createDatabaseClient();
const apiUrl = process.env.INQUIRIES_TEST_API_URL ?? "http://localhost:3001";
const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
after(() => database.$disconnect());

test("consultas HTTP direto/proxy persistem visitantes e contas, sem envio externo nem dados restantes", async () => {
  const users: string[] = []; const inquiries: string[] = []; const emails: string[] = [];
  try {
    const denied = await fetch(`${apiUrl}/api/inquiries`, { signal: AbortSignal.timeout(15_000) });
    assert.equal(denied.status, 401);
    const cookieName = denied.headers.get("set-cookie")!.split("=")[0];
    const accounts: { id: string; cookie: string; session: ReturnType<typeof newSession> }[] = [];
    for (const role of ["USER", "ADMIN"] as const) {
      const session = newSession(new Date());
      const user = await database.user.create({ data: { name: "Consulta HTTP", email: `inquiry-http-${randomUUID()}@exemplo.test`, passwordHash: "teste",
        role, sessions: { create: { tokenHash: session.tokenHash, expiresAt: session.expiresAt } } } });
      users.push(user.id); accounts.push({ id: user.id, cookie: `${cookieName}=${session.token}`, session });
    }
    const published = await database.property.findFirstOrThrow({ where: { isPublished: true } });
    const unpublished = await database.property.findFirstOrThrow({ where: { isPublished: false } });
    for (const origin of [apiUrl, webUrl]) {
      for (const account of [null, ...accounts]) {
        const contact = { requestId: randomUUID(), propertyId: published.id, name: "Maria Silva", email: `inquiry-http-${randomUUID()}@exemplo.test`, phone: "(11) 91234-5678", message: "Gostaria de agendar uma visita." };
        inquiries.push(contact.requestId); emails.push(contact.email);
        const headers: Record<string, string> = { "Content-Type": "application/json", ...(account ? { Cookie: account.cookie } : {}), "x-user-id": accounts[1].id };
        const call = (body = contact, extra: Record<string, string> = {}): Promise<Response> => fetch(`${origin}/api/inquiries`, { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
        const saved = await call(); assert.equal(saved.status, 201);
        assert.equal(saved.headers.get("cache-control"), "no-store"); assert.match(saved.headers.get("vary")!, /Cookie/i);
        const preparation = preparedInquirySchema.parse(await saved.json());
        assert.equal(preparation.inquiry.id, contact.requestId); assert.equal(preparation.payload.property_title, published.title);
        const repeated = await call(); assert.equal(repeated.status, 201);
        assert.deepEqual((await repeated.json()).inquiry, preparation.inquiry);
        const record = await database.inquiry.findUniqueOrThrow({ where: { id: contact.requestId } });
        assert.equal(record.userId, account?.id ?? null); assert.equal(record.phone, "+5511912345678");
        assert.equal(await database.inquiry.count({ where: { id: contact.requestId } }), 1);
        assert.equal((await call({ ...contact, message: "Outra mensagem de consulta." })).status, 409);
        assert.equal((await call({ ...contact, propertyId: unpublished.id, requestId: randomUUID() })).status, 404);
        assert.equal((await call(contact, { Origin: "https://externo.example" })).status, 403);
        assert.equal((await call({ ...contact, userId: accounts[1].id } as typeof contact)).status, 400);
        if (account) {
          const list = await fetch(`${origin}/api/inquiries`, { headers: { Cookie: account.cookie }, signal: AbortSignal.timeout(15_000) });
          assert.equal(list.status, 200); const page = await list.json();
          assert.ok(page.items.some((item: { id: string }) => item.id === contact.requestId));
          assert.ok(page.items.every((item: { id: string }) => inquiries.includes(item.id)));
          assert.doesNotMatch(JSON.stringify(page), /userId|passwordHash|phone|email|access_key/);
          const other = await fetch(`${origin}/api/inquiries`, { headers: { Cookie: accounts.find((item) => item.id !== account.id)!.cookie } });
          assert.ok(!(await other.json()).items.some((item: { id: string }) => item.id === contact.requestId));
        }
      }
    }
    await database.user.update({ where: { id: accounts[0].id }, data: { isActive: false } });
    const propertyId = published.id;
    const inactive = await fetch(`${apiUrl}/api/inquiries`, { method: "POST", headers: { Cookie: accounts[0].cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: randomUUID(), propertyId, name: "Maria Silva", email: "inativa@exemplo.test", phone: "(11) 91234-5678", message: "Não deve salvar esta consulta." }) });
    assert.equal(inactive.status, 401);
    await database.session.update({ where: { tokenHash: accounts[1].session.tokenHash }, data: { expiresAt: new Date(0) } });
    assert.equal((await fetch(`${webUrl}/api/inquiries`, { headers: { Cookie: accounts[1].cookie } })).status, 401);
  } finally {
    await database.inquiry.deleteMany({ where: { id: { in: inquiries } } });
    await database.user.deleteMany({ where: { id: { in: users } } });
    await database.authRateLimit.deleteMany({ where: { key: { in: emails.map((email) => createHash("sha256").update(`inquiries:${email}`).digest("hex")) } } });
  }
});
