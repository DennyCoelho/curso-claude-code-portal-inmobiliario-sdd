import "server-only";
import { hasAccessRole, type UserRole } from "@portal-inmobiliario/contracts/auth";
import { AuthError } from "@/lib/auth/error";
import { authService } from "./auth-service";

export function createAuthorizationService(authentication: Pick<typeof authService, "me"> = authService) {
  return {
    async requireUser(token: string | null, requiredRole: UserRole = "USER") {
      // /me consulta a sessão e o usuário atual no banco, sem confiar no cliente.
      const user = await authentication.me(token);
      if (!hasAccessRole(user.role, requiredRole)) {
        throw new AuthError(403, "Você não tem permissão para acessar este recurso.");
      }
      return user;
    },
  };
}

export const authorizationService = createAuthorizationService();
