import "server-only";
import { adminDashboardSchema, type AdminDashboard } from "@portal-inmobiliario/contracts/admin-dashboard";
import { getSessionCookieHeader } from "./authorization";

type DashboardResult = { status: "authorized"; dashboard: AdminDashboard } | { status: "unauthenticated" } | { status: "forbidden" };

export async function fetchAdminDashboard(cookieHeader: string, apiUrl: string): Promise<DashboardResult> {
  const cookie = getSessionCookieHeader(cookieHeader);
  if (!cookie) return { status: "unauthenticated" };
  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/admin/dashboard`, {
      headers: { Accept: "application/json", Cookie: cookie },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) throw new Error("Resposta indisponível.");
    return { status: "authorized", dashboard: adminDashboardSchema.parse(await response.json()) };
  } catch {
    throw new Error("Não foi possível carregar os indicadores. Tente novamente.");
  }
}
