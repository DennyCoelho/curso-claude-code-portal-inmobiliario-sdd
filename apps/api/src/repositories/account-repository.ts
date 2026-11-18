import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db";
import { AuthError } from "@/lib/auth/error";

const publicSelect = { id: true, name: true, email: true, role: true } as const;
const privateSelect = { ...publicSelect, passwordHash: true, isActive: true } as const;
type SessionData = { tokenHash: string; expiresAt: Date };
export const INVALID_EMAIL_CHANGE = "Este link é inválido, expirou ou já foi utilizado. Solicite uma nova mudança de e-mail na sua conta.";
const emailConflict = () => new AuthError(409, "Não foi possível usar este e-mail. Escolha outro endereço.");

export function createAccountRepository(database?: Prisma.TransactionClient) {
  const db = () => database ?? getDatabase();
  const transaction = <T>(work: (client: Prisma.TransactionClient) => Promise<T>) =>
    database ? work(database) : getDatabase().$transaction(work);

  async function lock(client: Prisma.TransactionClient, userId: string, tokenHash: string, clock: () => Date) {
    // Mesma ordem de bloqueios da recuperação: usuário antes das sessões.
    await client.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
    const sessions = await client.$queryRaw<{ expiresAt: Date }[]>`
      SELECT "expiresAt" FROM "Session" WHERE "tokenHash" = ${tokenHash} AND "userId" = ${userId}::uuid
      AND "expiresAt" > ${clock()} FOR UPDATE`;
    const user = await client.user.findUnique({ where: { id: userId }, select: privateSelect });
    if (!sessions.length || sessions[0].expiresAt <= clock() || !user?.isActive) throw new AuthError(401, "Entre na sua conta para continuar.");
    return user;
  }
  function checkPasswordHash(actual: string, expected: string) {
    if (actual !== expected) throw new AuthError(409, "Sua conta foi alterada. Atualize a página e tente novamente.");
  }
  async function renewSession(client: Prisma.TransactionClient, userId: string, session: SessionData) {
    await client.passwordReset.deleteMany({ where: { userId } });
    await client.emailChange.deleteMany({ where: { userId } });
    await client.session.deleteMany({ where: { userId } });
    await client.session.create({ data: { userId, tokenHash: session.tokenHash, expiresAt: session.expiresAt } });
  }
  async function emailOperation<T>(work: () => Promise<T>) {
    try { return await work(); } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw emailConflict();
      throw error;
    }
  }

  return {
    async credentials(userId: string, tokenHash: string, now: Date) {
      const session = await db().session.findFirst({
        where: { tokenHash, userId, expiresAt: { gt: now }, user: { isActive: true } },
        select: { user: { select: privateSelect } },
      });
      if (!session) throw new AuthError(401, "Entre na sua conta para continuar.");
      return session.user;
    },
    async updateName(userId: string, tokenHash: string, name: string, clock: () => Date) {
      return transaction(async (client) => {
        await lock(client, userId, tokenHash, clock);
        return client.user.update({ where: { id: userId }, data: { name }, select: publicSelect });
      });
    },
    async changePassword(userId: string, tokenHash: string, expectedHash: string, passwordHash: string, session: SessionData, clock: () => Date) {
      return transaction(async (client) => {
        const user = await lock(client, userId, tokenHash, clock);
        checkPasswordHash(user.passwordHash, expectedHash);
        const updated = await client.user.update({ where: { id: userId }, data: { passwordHash }, select: publicSelect });
        await renewSession(client, userId, session);
        return updated;
      });
    },
    async issueEmailChange(userId: string, tokenHash: string, expectedHash: string, email: string, pending: SessionData, clock: () => Date) {
      return emailOperation(() => transaction(async (client) => {
        const user = await lock(client, userId, tokenHash, clock);
        checkPasswordHash(user.passwordHash, expectedHash);
        if (email === user.email) throw new AuthError(400, "Informe um e-mail diferente do atual.");
        if (await client.user.findUnique({ where: { email }, select: { id: true } })) throw emailConflict();
        await client.emailChange.deleteMany({ where: { userId } });
        await client.emailChange.create({ data: { tokenHash: pending.tokenHash, expiresAt: pending.expiresAt, userId, previousEmail: user.email, newEmail: email } });
      }));
    },
    async removeEmailChange(tokenHash: string) {
      await db().emailChange.deleteMany({ where: { tokenHash } });
    },
    async confirmEmail(userId: string, sessionHash: string, tokenHash: string, session: SessionData, clock: () => Date) {
      return emailOperation(() => transaction(async (client) => {
        const user = await lock(client, userId, sessionHash, clock);
        const pending = await client.emailChange.findFirst({ where: { tokenHash, userId, previousEmail: user.email, expiresAt: { gt: clock() } } });
        if (!pending) throw new AuthError(400, INVALID_EMAIL_CHANGE);
        const updated = await client.user.update({ where: { id: userId }, data: { email: pending.newEmail }, select: publicSelect });
        await renewSession(client, userId, session);
        return updated;
      }));
    },
  };
}

export type AccountRepository = ReturnType<typeof createAccountRepository>;
