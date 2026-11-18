import { z } from "zod";
import { authResponseSchema } from "@portal-inmobiliario/contracts/auth";
import { emailChangeResponseSchema, passwordChangeResponseSchema, type ChangeEmailInput, type ChangePasswordInput, type ConfirmEmailInput, type UpdateProfileInput } from "@portal-inmobiliario/contracts/account";

export class AccountRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function request<T>(path: string, method: string, input: unknown, schema: z.ZodType<T>, expectedStatus = 200): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/account/${path}`, {
      method, credentials: "same-origin", cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(input), signal: AbortSignal.timeout(15_000),
    });
    if (response.status === expectedStatus) return schema.parse(await response.json());
  } catch { throw new Error("Não foi possível confirmar a operação. Verifique sua conexão e tente novamente."); }
  if (response.status === 401) throw new AccountRequestError(401, "Entre na conta que solicitou a alteração. Se estiver confirmando um e-mail, entre e reabra o link recebido.");
  if (response.status === 429) throw new AccountRequestError(429, "Muitas tentativas. Aguarde quinze minutos e tente novamente.");
  if (response.status === 503) throw new AccountRequestError(503, path === "email-change"
    ? "A mudança de e-mail está temporariamente indisponível. Tente novamente mais tarde."
    : "O serviço está ocupado. Tente novamente em instantes.");
  if (response.status === 400 && path === "email-change/confirm") throw new AccountRequestError(400, "Este link é inválido, expirou ou já foi utilizado. Solicite uma nova mudança de e-mail na sua conta.");
  // Somente mensagens públicas conhecidas podem ser apresentadas diretamente.
  const allowed = ["A senha atual está incorreta.", "Informe um e-mail diferente do atual.",
    "Não foi possível usar este e-mail. Escolha outro endereço.", "Sua conta foi alterada. Atualize a página e tente novamente."];
  if ([400, 409].includes(response.status)) {
    const error = await response.json().catch(() => null);
    if (error && allowed.includes(error.message)) throw new AccountRequestError(response.status, error.message);
    throw new AccountRequestError(response.status, "Confira os dados informados e tente novamente.");
  }
  throw new AccountRequestError(response.status, "Não foi possível concluir a operação. Tente novamente mais tarde.");
}

export const updateProfile = (input: UpdateProfileInput) => request("profile", "PATCH", input, authResponseSchema);
export const changeAccountPassword = (input: ChangePasswordInput) => request("password", "POST", input, passwordChangeResponseSchema);
export const requestEmailChange = (input: ChangeEmailInput) => request("email-change", "POST", input, emailChangeResponseSchema, 202);
export const confirmEmailChange = (input: ConfirmEmailInput) => request("email-change/confirm", "POST", input, authResponseSchema);
