import "server-only";

import { createDatabaseClient } from "./client";

const databaseGlobal = globalThis as typeof globalThis & {
  portalPrismaClient?: ReturnType<typeof createDatabaseClient>;
};

export function getDatabase() {
  databaseGlobal.portalPrismaClient ??= createDatabaseClient();

  return databaseGlobal.portalPrismaClient;
}
