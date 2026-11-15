import "server-only";
import { loginSchema, registerSchema } from "@portal-inmobiliario/contracts/auth";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { authService } from "@/services/auth-service";
import { AuthError } from "./error";
import { readSessionToken, setSessionCookie } from "./session";

const localOrigins = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001";

function validateOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const trustedOrigins = (process.env.AUTH_TRUSTED_ORIGINS ?? localOrigins).split(",").map((value) => value.trim());
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin !== null && !trustedOrigins.includes(origin))) {
    throw new AuthError(403, "Origem da solicitação não permitida.");
  }
}

async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new AuthError(415, "Envie os dados no formato JSON.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError(400, "Informe os dados de autenticação.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8_000) {
        await reader.cancel();
        throw new AuthError(413, "Os dados excedem o limite permitido.");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(400, "Informe um JSON válido.");
  } finally {
    reader.releaseLock();
  }
}

export async function handleAuth(action: "register" | "login" | "logout" | "me", request: Request): Promise<Response> {
  let response: Response;
  try {
    const previousToken = readSessionToken(request);
    if (action !== "me") validateOrigin(request);
    if (action === "me") {
      response = jsonResponse({ user: await authService.me(previousToken) });
    } else if (action === "logout") {
      await authService.logout(previousToken);
      response = setSessionCookie(new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } }), null);
    } else {
      const body = await readJson(request);
      const result = action === "register" ? registerSchema.safeParse(body) : loginSchema.safeParse(body);
      if (!result.success) throw new AuthError(400, action === "register"
        ? "Confira os dados: nome de 2 a 100 caracteres, e-mail válido, senha de 8 a 15 caracteres com maiúscula, número e caractere especial e confirmação igual."
        : "Informe um e-mail válido e sua senha.");
      const authenticated = action === "register"
        ? await authService.register(registerSchema.parse(result.data), previousToken)
        : await authService.login(result.data, previousToken);
      response = setSessionCookie(jsonResponse({ user: authenticated.user }, action === "register" ? 201 : 200), authenticated.token);
    }
  } catch (error) {
    // Não incluir dados de autenticação nem detalhes de persistência em logs/respostas.
    response = error instanceof AuthError
      ? errorResponse(error.status, error.message)
      : errorResponse(500, "Não foi possível concluir a autenticação. Tente novamente mais tarde.");
    if (action === "me" && response.status === 401) setSessionCookie(response, null);
    if (response.status === 429) response.headers.set("Retry-After", "900");
  }
  response.headers.set("Vary", "Cookie");
  return response;
}
