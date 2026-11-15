import { passwordRecoveryResponseSchema, type ForgotPasswordInput, type ResetPasswordInput } from "@portal-inmobiliario/contracts/auth";

export async function requestPasswordRecovery(action: "forgot-password" | "reset-password", input: ForgotPasswordInput | ResetPasswordInput): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${action}`, {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(input), signal: AbortSignal.timeout(15_000),
    });
    if (response.status === (action === "forgot-password" ? 202 : 200)) {
      passwordRecoveryResponseSchema.parse(await response.json());
      return;
    }
  } catch {
    throw new Error("Não foi possível confirmar a operação. Verifique sua conexão e tente novamente.");
  }
  if (response.status === 400 && action === "reset-password") throw new Error("Este link é inválido, expirou ou já foi utilizado. Solicite um novo link de recuperação.");
  if (response.status === 429) throw new Error("Muitas tentativas. Aguarde quinze minutos e tente novamente.");
  if (response.status === 503) throw new Error("A recuperação de senha está temporariamente indisponível. Tente novamente mais tarde.");
  throw new Error("Não foi possível concluir a operação. Tente novamente mais tarde.");
}
