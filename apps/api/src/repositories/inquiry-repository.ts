import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { INQUIRIES_PAGE_SIZE, type InquiryRequest } from "@portal-inmobiliario/contracts/inquiries";
import { getDatabase } from "@/lib/db";
import { AuthError } from "@/lib/auth/error";
import { createAuthRepository } from "./auth-repository";

type InquiryDatabase = Prisma.TransactionClient;

export function createInquiryRepository(database?: InquiryDatabase) {
  async function transaction<T>(work: (client: InquiryDatabase) => Promise<T>, readOnly = false): Promise<T> {
    return database ? work(database) : getDatabase().$transaction(work, { maxWait: 10_000, timeout: 15_000, ...(readOnly ? { isolationLevel: "RepeatableRead" } : {}) });
  }
  return {
    async save(contact: InquiryRequest, userId: string | null) {
      return transaction(async (client) => {
        // Serializa o mesmo UUID antes de comparar/incluir, inclusive entre instâncias.
        await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${contact.requestId}, 0))::text`;
        const [property] = await client.$queryRaw<{ id: string; title: string }[]>`
          SELECT "id", "title" FROM "Property" WHERE "id" = ${contact.propertyId}::uuid AND "isPublished" = true FOR SHARE`;
        if (!property) throw new AuthError(404, "Este imóvel não está disponível para contato.");
        const data = { propertyId: property.id, userId, name: contact.name, email: contact.email, phone: contact.phone, message: contact.message };
        const existing = await client.inquiry.findUnique({ where: { id: contact.requestId } });
        if (existing) {
          if (Object.entries(data).some(([key, value]) => existing[key as keyof typeof data] !== value)) {
            throw new AuthError(409, "Esta tentativa já foi utilizada. Inicie uma nova solicitação.");
          }
          return { id: existing.id, createdAt: existing.createdAt, property };
        }
        if (userId) {
          const [user] = await client.$queryRaw<{ id: string }[]>`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid AND "isActive" = true FOR SHARE`;
          if (!user) throw new AuthError(401, "Sua sessão terminou. Entre novamente antes de enviar.");
        }
        const rateKey = createHash("sha256").update(`inquiries:${contact.email}`).digest("hex");
        if (!await createAuthRepository(client).consumeAttempt(rateKey, new Date())) {
          throw new AuthError(429, "Muitas solicitações. Aguarde quinze minutos antes de tentar novamente.");
        }
        const saved = await client.inquiry.create({ data: { id: contact.requestId, ...data }, select: { id: true, createdAt: true } });
        return { ...saved, property };
      });
    },
    async list(userId: string, requestedPage: number) {
      return transaction(async (client) => {
        const total = await client.inquiry.count({ where: { userId } });
        const totalPages = Math.ceil(total / INQUIRIES_PAGE_SIZE);
        const page = Math.min(requestedPage, Math.max(1, totalPages));
        const items = await client.inquiry.findMany({ where: { userId },
          select: { id: true, message: true, createdAt: true, property: { select: { id: true, title: true, isPublished: true } } },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * INQUIRIES_PAGE_SIZE, take: INQUIRIES_PAGE_SIZE });
        return { items, total, page, pageSize: INQUIRIES_PAGE_SIZE, totalPages };
      }, true);
    },
  };
}
export type InquiryRepository = ReturnType<typeof createInquiryRepository>;
