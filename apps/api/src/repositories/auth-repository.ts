import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db";
import { AuthError } from "@/lib/auth/error";

type AuthDatabase = Pick<Prisma.TransactionClient, "user" | "session" | "$queryRaw">;
type SessionData = { tokenHash: string; expiresAt: Date };
const publicUserSelect = { id: true, name: true, email: true, role: true } as const;

export function createAuthRepository(database?: AuthDatabase) {
  const db = () => database ?? getDatabase();
  return {
    async register(data: { name: string; email: string; passwordHash: string }, session: SessionData) {
      try {
        return await db().user.create({
          data: { ...data, role: "USER", isActive: true, sessions: { create: session } },
          select: publicUserSelect,
        });
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          throw new AuthError(409, "Não foi possível cadastrar este e-mail. Tente entrar na sua conta.");
        }
        throw error;
      }
    },
    async findByEmail(email: string) {
      return db().user.findUnique({ where: { email }, select: { ...publicUserSelect, passwordHash: true, isActive: true } });
    },
    async createSession(userId: string, session: SessionData, expectedPasswordHash: string) {
      // Revalidar sob o bloqueio usado pela recuperação: um login iniciado com a
      // senha antiga não pode criar uma sessão após a redefinição.
      const created = await db().$queryRaw<{ tokenHash: string }[]>`
        INSERT INTO "Session" ("tokenHash", "userId", "expiresAt")
        SELECT ${session.tokenHash}, "id", ${session.expiresAt} FROM "User"
        WHERE "id" = ${userId}::uuid AND "isActive" = true AND "passwordHash" = ${expectedPasswordHash}
        FOR UPDATE
        RETURNING "tokenHash"`;
      if (created.length !== 1) throw new AuthError(401, "E-mail ou senha inválidos.");
    },
    async findSession(tokenHash: string) {
      return db().session.findUnique({
        where: { tokenHash },
        select: { expiresAt: true, user: { select: { ...publicUserSelect, isActive: true } } },
      });
    },
    async deleteSession(tokenHash: string) {
      await db().session.deleteMany({ where: { tokenHash } });
    },
    async consumeAttempt(key: string, now: Date): Promise<boolean> {
      const windowStart = new Date(now.getTime() - 15 * 60 * 1000);
      // O UPSERT serializa tentativas concorrentes, inclusive entre instâncias.
      const [result] = await db().$queryRaw<{ attempts: number }[]>`
        INSERT INTO "AuthRateLimit" ("key", "attempts", "windowStart") VALUES (${key}, 1, ${now})
        ON CONFLICT ("key") DO UPDATE SET
          "attempts" = CASE WHEN "AuthRateLimit"."windowStart" <= ${windowStart} THEN 1 ELSE LEAST("AuthRateLimit"."attempts" + 1, 11) END,
          "windowStart" = CASE WHEN "AuthRateLimit"."windowStart" <= ${windowStart} THEN ${now} ELSE "AuthRateLimit"."windowStart" END
        RETURNING "attempts"`;
      return result.attempts <= 10;
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
