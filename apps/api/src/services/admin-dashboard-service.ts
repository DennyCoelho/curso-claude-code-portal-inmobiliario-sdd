import "server-only";
import { adminDashboardSchema, type AdminDashboard } from "@portal-inmobiliario/contracts/admin-dashboard";
import { createAdminDashboardRepository, type AdminDashboardRepository } from "@/repositories/admin-dashboard-repository";

export function createAdminDashboardService(repository: AdminDashboardRepository = createAdminDashboardRepository()) {
  return {
    async getCounts(): Promise<AdminDashboard> {
      return adminDashboardSchema.parse(await repository.getCounts());
    },
  };
}

export const adminDashboardService = createAdminDashboardService();
