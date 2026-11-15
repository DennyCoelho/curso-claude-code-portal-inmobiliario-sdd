import nextEnv from "@next/env";
import { createDatabaseClient } from "../src/lib/db/client";
import { assertTestUsersEnvironment, seedTestUsers } from "./seed-users-database";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  assertTestUsersEnvironment();
  const database = createDatabaseClient();
  try {
    const result = await database.$transaction((transaction) => seedTestUsers(transaction, { resetPasswords: process.argv.includes("--reset-passwords") }), { timeout: 30_000 });
    console.log(`Usuários de teste: ${result.created} criados, ${result.preserved} preservados e ${result.passwordsReset} senhas atualizadas. Credenciais no README.`);
  } finally {
    await database.$disconnect();
  }
}

main().catch(() => {
  console.error(process.env.NODE_ENV === "production"
    ? "O seed de usuários de teste não pode ser executado em produção."
    : "Não foi possível criar os usuários de teste. Confira a conexão, as migrações e possíveis conflitos de e-mail. Nenhuma conta foi alterada.");
  process.exitCode = 1;
});
