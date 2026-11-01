import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client";

import { getDatabaseUrl } from "./config";

export function createDatabaseClient() {
  const adapter = new PrismaPg({
    connectionString: getDatabaseUrl(),
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  return new PrismaClient({ adapter });
}
