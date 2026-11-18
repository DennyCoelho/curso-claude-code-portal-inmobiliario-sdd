import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db";
import { publicPropertySelect, type PublicPropertyRecord } from "./public-property-repository";
import { FAVORITES_PAGE_SIZE, favoriteQuerySchema, type FavoriteQuery, type FavoritePage } from "@portal-inmobiliario/contracts/favorites";

type FavoriteDatabase = Pick<Prisma.TransactionClient, "favorite" | "$queryRaw">;

export function createFavoriteRepository(database?: FavoriteDatabase) {
  const db = () => database ?? getDatabase();
  return {
    async ids(userId: string) {
      const records = await db().favorite.findMany({ where: { userId, property: { isPublished: true } },
        select: { propertyId: true }, orderBy: { propertyId: "asc" } });
      return records.map(({ propertyId }) => propertyId);
    },
    async list(userId: string, query: FavoriteQuery = favoriteQuerySchema.parse({})) {
      const contains = query.search.replace(/[\\%_]/g, "\\$&");
      const where: Prisma.FavoriteWhereInput = { userId, property: { isPublished: true,
        ...(query.operation ? { operation: query.operation } : {}), ...(query.type ? { type: query.type } : {}),
        ...(contains ? { OR: ["title", "description", "neighborhood", "city", "state"].map((field) => ({ [field]: { contains, mode: "insensitive" } })) } : {}),
      } };
      const orderBy: Prisma.FavoriteOrderByWithRelationInput[] = [
        ...(query.sort.startsWith("price_") ? [{ property: { price: query.sort === "price_asc" ? "asc" as const : "desc" as const } }] : []),
        { createdAt: query.sort === "saved_asc" ? "asc" : "desc" }, { propertyId: "asc" },
      ];
      async function read(client: FavoriteDatabase): Promise<FavoritePage<PublicPropertyRecord>> {
        const total = await client.favorite.count({ where });
        const totalPages = Math.ceil(total / FAVORITES_PAGE_SIZE);
        const page = Math.min(query.page, Math.max(1, totalPages));
        const records = await client.favorite.findMany({ where, select: { property: { select: publicPropertySelect } },
          orderBy, skip: (page - 1) * FAVORITES_PAGE_SIZE, take: FAVORITES_PAGE_SIZE });
        return { items: records.map(({ property }) => property), total, page, pageSize: FAVORITES_PAGE_SIZE, totalPages };
      }
      return database ? read(database) : getDatabase().$transaction(read, { isolationLevel: "RepeatableRead" });
    },
    async add(userId: string, propertyId: string): Promise<boolean> {
      // Publicação e inclusão compartilham a mesma instrução; a chave única
      // resolve repetições concorrentes sem alterar a data original.
      const [result] = await db().$queryRaw<{ available: boolean }[]>`
        WITH available AS (
          SELECT "id" FROM "Property" WHERE "id" = ${propertyId}::uuid AND "isPublished" = true FOR SHARE
        ), saved AS (
          INSERT INTO "Favorite" ("id", "userId", "propertyId", "createdAt")
          SELECT ${randomUUID()}::uuid, ${userId}::uuid, "id", CURRENT_TIMESTAMP FROM available
          ON CONFLICT ("userId", "propertyId") DO NOTHING RETURNING "id"
        )
        SELECT EXISTS (SELECT 1 FROM available) AS available`;
      return result.available;
    },
    async remove(userId: string, propertyId: string) {
      await db().favorite.deleteMany({ where: { userId, propertyId } });
    },
  };
}

export type FavoriteRepository = ReturnType<typeof createFavoriteRepository>;
