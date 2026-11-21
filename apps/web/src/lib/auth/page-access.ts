import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@portal-inmobiliario/contracts/auth";
import { fetchAuthorizedUser } from "@/lib/api/authorization";
import { fetchAdminDashboard } from "@/lib/api/admin-dashboard";

const getPrivateSession = cache(async (requiredRole: UserRole) => {
  const cookie = (await headers()).get("cookie") ?? "";
  return fetchAuthorizedUser(cookie, requiredRole, process.env.API_URL ?? "http://127.0.0.1:3001");
});

export async function requirePageUser(requiredRole: UserRole = "USER") {
  const session = await getPrivateSession(requiredRole);
  if (session.status === "unauthenticated") {
    const destination = requiredRole === "ADMIN" ? "/admin" : "/account";
    redirect(`/login?${new URLSearchParams({ next: destination })}`);
  }
  if (session.status === "forbidden") redirect("/access-denied");
  return session.user;
}

export async function requireAdminDashboard() {
  const cookie = (await headers()).get("cookie") ?? "";
  const result = await fetchAdminDashboard(cookie, process.env.API_URL ?? "http://127.0.0.1:3001");
  if (result.status === "unauthenticated") redirect("/login?next=%2Fadmin");
  if (result.status === "forbidden") redirect("/access-denied");
  return result.dashboard;
}
