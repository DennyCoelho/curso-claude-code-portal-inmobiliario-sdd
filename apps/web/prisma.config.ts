import nextEnv from "@next/env";
import { defineConfig } from "prisma/config";

nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Gerar e validar o cliente não exige credenciais; os comandos de banco exigem.
  datasource: { url: process.env.DATABASE_URL },
});
