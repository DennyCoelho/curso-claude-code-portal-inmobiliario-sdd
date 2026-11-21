import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AdminDashboard } from "@portal-inmobiliario/contracts/admin-dashboard";
import { getDatabase } from "@/lib/db";

export function createAdminDashboardRepository(database?: Prisma.TransactionClient) {
  async function count(client: Prisma.TransactionClient): Promise<AdminDashboard> {
    const [totalProperties, publishedProperties, saleProperties, rentProperties, totalUsers, totalInquiries] = await Promise.all([
      client.property.count(),
      client.property.count({ where: { isPublished: true } }),
      client.property.count({ where: { operation: "SALE" } }),
      client.property.count({ where: { operation: "RENT" } }),
      client.user.count(),
      client.inquiry.count(),
    ]);
    return { totalProperties, publishedProperties, saleProperties, rentProperties, totalUsers, totalInquiries };
  }

  return {
    async getCounts() {
      return database ? count(database) : getDatabase().$transaction(count, {
        isolationLevel: "RepeatableRead", maxWait: 10_000, timeout: 15_000,
      });
    },
  };
}

export type AdminDashboardRepository = ReturnType<typeof createAdminDashboardRepository>;
