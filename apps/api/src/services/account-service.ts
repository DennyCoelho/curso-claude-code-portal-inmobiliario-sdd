import "server-only";
import { randomBytes } from "node:crypto";
import type { ChangeEmailInput, ChangePasswordInput, UpdateProfileInput } from "@portal-inmobiliario/contracts/account";
import { AuthError } from "@/lib/auth/error";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken, newSession } from "@/lib/auth/session";
import { emailChangeConfiguration, sendEmailChange, EMAIL_CHANGE_UNAVAILABLE } from "@/lib/auth/account-email";
import { createAuthRepository } from "@/repositories/auth-repository";
import { createAccountRepository, type AccountRepository } from "@/repositories/account-repository";

export const EMAIL_CHANGE_SECONDS = 30 * 60;
export function createAccountService(
  repository: AccountRepository = createAccountRepository(),
  attempts: Pick<ReturnType<typeof createAuthRepository>, "consumeAttempt"> = createAuthRepository(),
  clock = () => new Date(),
  mailer = { configuration: emailChangeConfiguration, send: sendEmailChange },
) {
  async function throttle(userId: string) {
    if (!await attempts.consumeAttempt(hashToken(`account-sensitive:${userId}`), clock())) {
      throw new AuthError(429, "Muitas tentativas. Aguarde quinze minutos e tente novamente.");
    }
  }
  async function reauthenticate(userId: string, token: string, password: string) {
    await throttle(userId);
    const user = await repository.credentials(userId, hashToken(token), clock());
    if (!await verifyPassword(password, user.passwordHash)) throw new AuthError(400, "A senha atual está incorreta.");
    return user;
  }
  return {
    async updateProfile(userId: string, token: string, input: UpdateProfileInput) {
      return repository.updateName(userId, hashToken(token), input.name, clock);
    },
    async changePassword(userId: string, token: string, input: ChangePasswordInput) {
      if (!input.currentPassword && !input.newPassword && !input.confirmPassword) {
        const { id, name, email, role } = await repository.credentials(userId, hashToken(token), clock());
        return { user: { id, name, email, role }, changed: false, token: null };
      }
      const user = await reauthenticate(userId, token, input.currentPassword);
      const passwordHash = await hashPassword(input.newPassword);
      const session = newSession(clock());
      const updated = await repository.changePassword(userId, hashToken(token), user.passwordHash, passwordHash, session, clock);
      return { user: updated, changed: true, token: session.token };
    },
    async requestEmailChange(userId: string, token: string, input: ChangeEmailInput) {
      const user = await reauthenticate(userId, token, input.currentPassword);
      const configuration = mailer.configuration();
      const confirmation = randomBytes(32).toString("hex");
      const tokenHash = hashToken(confirmation);
      await repository.issueEmailChange(userId, hashToken(token), user.passwordHash, input.email,
        { tokenHash, expiresAt: new Date(clock().getTime() + EMAIL_CHANGE_SECONDS * 1000) }, clock);
      try { await mailer.send(configuration, input.email, confirmation); } catch {
        try { await repository.removeEmailChange(tokenHash); } catch { console.warn("Não foi possível invalidar uma mudança de e-mail após falha de envio."); }
        throw new AuthError(503, EMAIL_CHANGE_UNAVAILABLE);
      }
    },
    async confirmEmail(userId: string, token: string, confirmation: string) {
      await throttle(userId);
      const session = newSession(clock());
      const user = await repository.confirmEmail(userId, hashToken(token), hashToken(confirmation), session, clock);
      return { user, token: session.token };
    },
  };
}

export const accountService = createAccountService();
