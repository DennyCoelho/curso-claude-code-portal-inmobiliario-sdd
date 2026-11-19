import { inquiryRequestSchema, inquiryPageNumberSchema } from "@portal-inmobiliario/contracts/inquiries";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { readJson, validateOrigin } from "@/lib/auth/handler";
import { readSessionToken, sessionCookieName, setSessionCookie } from "@/lib/auth/session";
import { withAuthorization } from "@/lib/auth/authorization";
import { AuthError } from "@/lib/auth/error";
import { authorizationService } from "@/services/authorization-service";
import { ContactError } from "@/services/property-contact-service";
import { inquiryService } from "@/services/inquiry-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let response: Response;
  try {
    validateOrigin(request);
    const result = inquiryRequestSchema.safeParse(await readJson(request, 20_000));
    if (!result.success) throw new AuthError(400, "Confira os dados de contato e os identificadores da solicitação.");
    const token = readSessionToken(request);
    const hasSessionCookie = (request.headers.get("cookie") ?? "").split(";").some((cookie) => cookie.trim().split("=")[0] === sessionCookieName());
    if (hasSessionCookie && !token) throw new AuthError(401, "Sua sessão terminou. Entre novamente antes de enviar.");
    const user = token ? await authorizationService.requireUser(token) : null;
    response = jsonResponse(await inquiryService.create(result.data, user?.id ?? null), 201);
  } catch (error) {
    response = error instanceof AuthError || error instanceof ContactError ? errorResponse(error.status, error.message)
      : errorResponse(500, "Não foi possível confirmar o registro da consulta. Tente novamente com os mesmos dados.");
    if (response.status === 401) setSessionCookie(response, null);
    if (response.status === 429) response.headers.set("Retry-After", "900");
  }
  response.headers.set("Vary", "Cookie");
  return response;
}

export async function GET(request: Request): Promise<Response> {
  return withAuthorization(request, "USER", async (user) => {
    const parameters = new URL(request.url).searchParams;
    const pages = parameters.getAll("page");
    const parsed = inquiryPageNumberSchema.safeParse(pages.length ? pages[0] : 1);
    if (!parsed.success || pages.length > 1 || [...parameters.keys()].some((name) => name !== "page")) {
      return errorResponse(400, "Informe uma página de consultas válida.");
    }
    return jsonResponse(await inquiryService.list(user.id, parsed.data));
  });
}
