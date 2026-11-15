import "server-only";
import { after } from "next/server";
import { forgotPasswordSchema, resetPasswordSchema, PASSWORD_RECOVERY_MESSAGE } from "@portal-inmobiliario/contracts/auth";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { passwordResetService } from "@/services/password-reset-service";
import { AuthError } from "./error";
import { readJson, validateOrigin } from "./handler";
import { setSessionCookie } from "./session";

export async function handlePasswordRecovery(action: "forgot-password" | "reset-password", request: Request): Promise<Response> {
  try {
    validateOrigin(request);
    const body = await readJson(request);
    if (action === "forgot-password") {
      const parsed = forgotPasswordSchema.safeParse(body);
      if (!parsed.success) throw new AuthError(400, "Informe um e-mail válido.");
      await passwordResetService.request(parsed.data, (task) => after(task));
      return jsonResponse({ message: PASSWORD_RECOVERY_MESSAGE }, 202);
    }
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) throw new AuthError(400, "Confira o link, os critérios da nova senha e a confirmação.");
    await passwordResetService.reset(parsed.data);
    return setSessionCookie(jsonResponse({ message: "Senha redefinida com sucesso. Entre com sua nova senha." }), null);
  } catch (error) {
    const response = error instanceof AuthError
      ? errorResponse(error.status, error.message)
      : errorResponse(500, "Não foi possível concluir a recuperação de senha. Tente novamente mais tarde.");
    if (response.status === 429) response.headers.set("Retry-After", "900");
    return response;
  }
}
