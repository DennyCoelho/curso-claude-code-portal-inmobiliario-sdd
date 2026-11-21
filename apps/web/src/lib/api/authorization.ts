import "server-only";
import { authResponseSchema, hasAccessRole, type AuthenticatedUser, type UserRole } from "@portal-inmobiliario/contracts/auth";

type PrivateSession = { status: "authenticated"; user: AuthenticatedUser } | { status: "unauthenticated" } | { status: "forbidden" };

export function getSessionCookieHeader(cookieHeader: string): string {
  // Encaminhar apenas cookies de sessão; preservar duplicados para o backend recusá-los.
  const sessionCookies = cookieHeader.split(";").map((part) => part.trim())
    .filter((part) => /^(?:__Host-portal_session|portal_session)=/.test(part));
  return sessionCookies.some((part) => /=[a-f0-9]{64}$/.test(part)) ? sessionCookies.join("; ") : "";
}

export async function fetchAuthorizedUser(cookieHeader: string, requiredRole: UserRole, apiUrl: string): Promise<PrivateSession> {
  const cookie = getSessionCookieHeader(cookieHeader);
  if (!cookie) return { status: "unauthenticated" };
  try {
    const path = requiredRole === "ADMIN" ? "/api/admin/session" : "/api/auth/me";
    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}${path}`, {
      headers: { Accept: "application/json", Cookie: cookie },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 403) return { status: "forbidden" };
    if (!response.ok) throw new Error("Resposta indisponível.");
    const { user } = authResponseSchema.parse(await response.json());
    return hasAccessRole(user.role, requiredRole) ? { status: "authenticated", user } : { status: "forbidden" };
  } catch {
    throw new Error("Não foi possível verificar seu acesso. Tente novamente.");
  }
}
