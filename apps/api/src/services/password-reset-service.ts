import "server-only";
import { randomBytes } from "node:crypto";
import type { ForgotPasswordInput, ResetPasswordInput } from "@portal-inmobiliario/contracts/auth";
import { AuthError } from "@/lib/auth/error";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/session";
import { recoveryEmailConfiguration, sendRecoveryEmail } from "@/lib/auth/recovery-email";
import { createAuthRepository } from "@/repositories/auth-repository";
import { createPasswordResetRepository, type PasswordResetRepository } from "@/repositories/password-reset-repository";

export const RESET_SECONDS = 30 * 60;
export const INVALID_RESET_LINK = "Este link é inválido, expirou ou já foi utilizado. Solicite um novo link de recuperação.";
type Schedule = (task: () => Promise<void>) => void;

export function createPasswordResetService(
  repository: PasswordResetRepository = createPasswordResetRepository(),
  attempts: Pick<ReturnType<typeof createAuthRepository>, "consumeAttempt"> = createAuthRepository(),
  clock = () => new Date(),
  mailer = { configuration: recoveryEmailConfiguration, send: sendRecoveryEmail },
) {
  async function throttle(operation: string, identifier: string) {
    if (!await attempts.consumeAttempt(hashToken(`${operation}:${identifier}`), clock())) {
      throw new AuthError(429, "Muitas tentativas. Aguarde quinze minutos e tente novamente.");
    }
  }
  return {
    async request(input: ForgotPasswordInput, schedule: Schedule) {
      await throttle("forgot-password", input.email);
      const configuration = mailer.configuration();
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const user = await repository.issue(input.email, { tokenHash, expiresAt: new Date(clock().getTime() + RESET_SECONDS * 1000) });
      if (!user) return;
      schedule(async () => {
        try {
          await mailer.send(configuration, user.email, token);
        } catch {
          // Não registrar destinatário, token, credenciais nem respostas do provedor.
          console.warn("Não foi possível enviar um e-mail de recuperação de senha.");
          try { await repository.remove(tokenHash); } catch { console.warn("Não foi possível invalidar um link de recuperação após falha de envio."); }
        }
      });
    },
    async reset(input: ResetPasswordInput) {
      await throttle("reset-password", input.token);
      const tokenHash = hashToken(input.token);
      if (!await repository.findValid(tokenHash, clock())) throw new AuthError(400, INVALID_RESET_LINK);
      const passwordHash = await hashPassword(input.password);
      if (!await repository.consume(tokenHash, passwordHash, clock)) throw new AuthError(400, INVALID_RESET_LINK);
    },
  };
}

export const passwordResetService = createPasswordResetService();
