import "server-only";
import type { AuthenticatedUser, UserRole } from "@portal-inmobiliario/contracts/auth";
import { errorResponse } from "@/lib/api/response";
import { authorizationService } from "@/services/authorization-service";
import { AuthError } from "./error";
import { validateOrigin } from "./handler";
import { readSessionToken, setSessionCookie } from "./session";

export async function withAuthorization(
  request: Request,
  requiredRole: UserRole,
  handle: (user: AuthenticatedUser) => Response | Promise<Response>,
): Promise<Response> {
  let response: Response;
  try {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) validateOrigin(request);
    const user = await authorizationService.requireUser(readSessionToken(request), requiredRole);
    response = await handle(user);
  } catch (error) {
    response = error instanceof AuthError
      ? errorResponse(error.status, error.message)
      : errorResponse(500, "Não foi possível verificar sua permissão. Tente novamente mais tarde.");
    if (response.status === 401) setSessionCookie(response, null);
  }
  response.headers.set("Cache-Control", "no-store");
  const vary = response.headers.get("Vary");
  response.headers.set("Vary", vary ? `${vary}, Cookie` : "Cookie");
  return response;
}
