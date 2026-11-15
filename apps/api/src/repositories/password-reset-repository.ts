import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db";

export function createPasswordResetRepository(database?: Prisma.TransactionClient) {
  const db = () => database ?? getDatabase();
  const transaction = <T>(work: (client: Prisma.TransactionClient) => Promise<T>) =>
    database ? work(database) : getDatabase().$transaction(work);

  return {
    async issue(email: string, data: { tokenHash: string; expiresAt: Date }) {
      return transaction(async (client) => {
        // O mesmo bloqueio serializa emissão e consumo, inclusive entre instâncias.
        const users = await client.$queryRaw<{ id: string; email: string }[]>`
          SELECT "id", "email" FROM "User" WHERE "email" = ${email} AND "isActive" = true FOR UPDATE`;
        const user = users[0];
        if (!user) return null;
        await client.passwordReset.deleteMany({ where: { userId: user.id } });
        await client.passwordReset.create({ data: { ...data, userId: user.id } });
        return user;
      });
    },
    async findValid(tokenHash: string, now: Date) {
      return db().passwordReset.findFirst({ where: { tokenHash, expiresAt: { gt: now }, user: { isActive: true } }, select: { userId: true } });
    },
    async consume(tokenHash: string, passwordHash: string, clock = () => new Date()): Promise<boolean> {
      return transaction(async (client) => {
        const candidate = await client.passwordReset.findUnique({ where: { tokenHash }, select: { userId: true } });
        if (!candidate) return false;
        await client.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.userId}::uuid FOR UPDATE`;
        const valid = await client.passwordReset.findFirst({ where: { tokenHash, expiresAt: { gt: clock() }, user: { isActive: true } } });
        if (!valid) return false;
        await client.user.update({ where: { id: valid.userId }, data: { passwordHash } });
        await client.passwordReset.deleteMany({ where: { userId: valid.userId } });
        await client.session.deleteMany({ where: { userId: valid.userId } });
        return true;
      });
    },
    async remove(tokenHash: string) {
      await db().passwordReset.deleteMany({ where: { tokenHash } });
    },
  };
}

export type PasswordResetRepository = ReturnType<typeof createPasswordResetRepository>;
