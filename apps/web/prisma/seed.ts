import nextEnv from "@next/env";

import { createDatabaseClient } from "../src/lib/db/client";

import { seedDevelopmentData } from "./seed-database";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("O seed de demonstração não pode ser executado em produção.");
    process.exitCode = 1;
    return;
  }

  const database = createDatabaseClient();

  try {
    const result = await database.$transaction(seedDevelopmentData, {
      timeout: 30_000,
    });

    console.log(
      `Seed concluído: ${result.properties} imóveis de demonstração e ${result.features} características disponíveis.`,
    );
  } finally {
    await database.$disconnect();
  }
}

main().catch(() => {
  console.error(
    "Não foi possível criar o seed. Confira DATABASE_URL, a conexão com o PostgreSQL e as migrações aplicadas.",
  );
  process.exitCode = 1;
});
