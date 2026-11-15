import { authResponseSchema, type AuthenticatedUser, type LoginInput, type RegisterInput } from "@portal-inmobiliario/contracts/auth";

export async function requestAuth(action: "me" | "login" | "register" | "logout", input?: LoginInput | RegisterInput): Promise<AuthenticatedUser | null> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${action}`, {
      method: action === "me" ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", ...(input ? { "Content-Type": "application/json" } : {}) },
      ...(input ? { body: JSON.stringify(input) } : {}),
      signal: AbortSignal.timeout(15_000),
    });
    if (action === "me" && response.status === 401) return null;
    if (action === "logout" && response.status === 204) return null;
    if (response.ok) return authResponseSchema.parse(await response.json()).user;
  } catch {
    throw new Error("Não foi possível confirmar a operação. Verifique sua conexão e tente novamente.");
  }
  if (response.status === 401) throw new Error("E-mail ou senha inválidos.");
  if (response.status === 409) throw new Error("Este e-mail já está cadastrado. Tente entrar na sua conta.");
  if (response.status === 429) throw new Error("Muitas tentativas. Aguarde quinze minutos e tente novamente.");
  if (response.status === 503) throw new Error("Autenticação ocupada. Tente novamente em instantes.");
  throw new Error("Não foi possível concluir a operação. Tente novamente mais tarde.");
}
