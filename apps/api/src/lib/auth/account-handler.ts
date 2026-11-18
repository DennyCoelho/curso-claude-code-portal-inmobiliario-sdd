import "server-only";
import { changeEmailSchema, changePasswordSchema, confirmEmailSchema, updateProfileSchema } from "@portal-inmobiliario/contracts/account";
import { jsonResponse } from "@/lib/api/response";
import { accountService } from "@/services/account-service";
import { withAuthorization } from "./authorization";
import { AuthError } from "./error";
import { readJson } from "./handler";
import { readSessionToken, setSessionCookie } from "./session";

export function handleAccount(action: "profile" | "password" | "email-change" | "confirm-email", request: Request) {
  return withAuthorization(request, "USER", async (user) => {
    const body = await readJson(request);
    const token = readSessionToken(request)!;
    if (action === "profile") {
      const parsed = updateProfileSchema.safeParse(body);
      if (!parsed.success) throw new AuthError(400, "Informe seu nome com 2 a 100 caracteres.");
      return jsonResponse({ user: await accountService.updateProfile(user.id, token, parsed.data) });
    }
    if (action === "password") {
      const parsed = changePasswordSchema.safeParse(body);
      if (!parsed.success) throw new AuthError(400, "Confira a senha atual, os critérios da nova senha e a confirmação.");
      const result = await accountService.changePassword(user.id, token, parsed.data);
      const response = jsonResponse({ user: result.user, changed: result.changed });
      return result.token ? setSessionCookie(response, result.token) : response;
    }
    if (action === "email-change") {
      const parsed = changeEmailSchema.safeParse(body);
      if (!parsed.success) throw new AuthError(400, "Informe um e-mail válido e sua senha atual.");
      await accountService.requestEmailChange(user.id, token, parsed.data);
      return jsonResponse({ message: "Enviamos um link para o novo e-mail. Confirme em até 30 minutos; seu endereço atual permanece válido até lá." }, 202);
    }
    const parsed = confirmEmailSchema.safeParse(body);
    if (!parsed.success) throw new AuthError(400, "Link de confirmação inválido.");
    const result = await accountService.confirmEmail(user.id, token, parsed.data.token);
    return setSessionCookie(jsonResponse({ user: result.user }), result.token);
  });
}
