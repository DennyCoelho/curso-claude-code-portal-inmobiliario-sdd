import "server-only";
import type { AuthenticatedUser, LoginInput, RegisterInput } from "@portal-inmobiliario/contracts/auth";
import { AuthError } from "@/lib/auth/error";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken, isSessionToken, newSession } from "@/lib/auth/session";
import { createAuthRepository, type AuthRepository } from "@/repositories/auth-repository";

function publicUser(user: AuthenticatedUser): AuthenticatedUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function createAuthService(repository: AuthRepository = createAuthRepository(), clock = () => new Date()) {
  async function throttle(operation: string, email: string) {
    if (!await repository.consumeAttempt(hashToken(`${operation}:${email}`), clock())) {
      throw new AuthError(429, "Muitas tentativas. Aguarde quinze minutos e tente novamente.");
    }
  }
  async function logout(token: string | null) {
    if (isSessionToken(token)) await repository.deleteSession(hashToken(token));
  }
  return {
    async register(input: RegisterInput, previousToken: string | null = null) {
      await throttle("register", input.email);
      const passwordHash = await hashPassword(input.password);
      const session = newSession(clock());
      const user = await repository.register({ name: input.name, email: input.email, passwordHash }, { tokenHash: session.tokenHash, expiresAt: session.expiresAt });
      await logout(previousToken);
      return { user: publicUser(user), token: session.token };
    },
    async login(input: LoginInput, previousToken: string | null = null) {
      await throttle("login", input.email);
      const user = await repository.findByEmail(input.email);
      const validPassword = await verifyPassword(input.password, user?.passwordHash ?? null);
      if (!user || !user.isActive || !validPassword) throw new AuthError(401, "E-mail ou senha inválidos.");
      const session = newSession(clock());
      await repository.createSession(user.id, { tokenHash: session.tokenHash, expiresAt: session.expiresAt });
      await logout(previousToken);
      return { user: publicUser(user), token: session.token };
    },
    async me(token: string | null): Promise<AuthenticatedUser> {
      const session = isSessionToken(token) ? await repository.findSession(hashToken(token)) : null;
      if (!session || session.expiresAt <= clock() || !session.user.isActive) {
        await logout(token);
        throw new AuthError(401, "Entre na sua conta para continuar.");
      }
      return publicUser(session.user);
    },
    logout,
  };
}

export const authService = createAuthService();
