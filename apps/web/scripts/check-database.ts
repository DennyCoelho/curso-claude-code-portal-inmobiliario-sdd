import assert from "node:assert/strict";
import nextEnv from "@next/env";

import { createDatabaseClient } from "../src/lib/db/client";

nextEnv.loadEnvConfig(process.cwd());

async function checkDatabase() {
  const database = createDatabaseClient();

  try {
    const result = await database.$queryRaw<
      { database: string; connected: number }[]
    >`SELECT current_database()::text AS database, 1 AS connected`;

    assert.equal(result[0]?.connected, 1);
    console.log(
      `Conexão com o PostgreSQL validada pelo Prisma: ${result[0].database}.`,
    );
  } finally {
    await database.$disconnect();
  }
}

checkDatabase().catch(() => {
  console.error(
    "Não foi possível validar a conexão. Confira DATABASE_URL e se o PostgreSQL está em execução.",
  );
  process.exitCode = 1;
});
