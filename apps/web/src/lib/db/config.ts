export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Configure DATABASE_URL em apps/web/.env.local.");
  }

  return databaseUrl;
}
