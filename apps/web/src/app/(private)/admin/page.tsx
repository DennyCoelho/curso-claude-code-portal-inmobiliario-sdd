import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireAdminDashboard } from "@/lib/auth/page-access";

export const metadata: Metadata = { title: "Painel administrativo" };

export default async function AdminPage() {
  const dashboard = await requireAdminDashboard();
  return <AdminDashboard dashboard={dashboard} />;
}
