import type { Prisma } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { seedUsers } from "./seed-users-data";

export function assertTestUsersEnvironment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O seed de usuários de teste não pode ser executado em produção.");
  }
}

export async function seedTestUsers(transaction: Pick<Prisma.TransactionClient, "user" | "session">, options: { resetPasswords?: boolean } = {}) {
  assertTestUsersEnvironment();
  let created = 0;
  let passwordsReset = 0;
  for (const { password, ...data } of seedUsers) {
    const existing = await transaction.user.findUnique({ where: { id: data.id }, select: { id: true, email: true } });
    if (existing) {
      if (options.resetPasswords) {
        if (existing.email !== data.email) throw new Error("A conta existente não corresponde ao usuário de demonstração esperado.");
        await transaction.user.update({ where: { id: data.id }, data: { passwordHash: await hashPassword(password) } });
        await transaction.session.deleteMany({ where: { userId: data.id } });
        passwordsReset++;
      }
      continue;
    }
    // Não atualizar por e-mail: um conflito não deve modificar outra conta.
    await transaction.user.create({ data: { ...data, passwordHash: await hashPassword(password) } });
    created++;
  }
  return { created, preserved: seedUsers.length - created - passwordsReset, passwordsReset };
}
