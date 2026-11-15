import { propertyContactSchema } from "@portal-inmobiliario/contracts/property-contact";
import { errorResponse, jsonResponse } from "@/lib/api/response";
import { ContactError, propertyContactService } from "@/services/property-contact-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return errorResponse(415, "Envie os dados no formato JSON.");
  }
  let body: unknown;
  try {
    // O limite considera bytes reais, independentemente de Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return errorResponse(400, "Informe os dados de contato.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20_000) {
        await reader.cancel();
        return errorResponse(413, "Os dados de contato excedem o limite permitido.");
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return errorResponse(400, "Informe um JSON válido.");
  }
  const result = propertyContactSchema.safeParse(body);
  if (!result.success) return errorResponse(400, "Confira os dados de contato e o identificador do imóvel.");
  try {
    return jsonResponse(await propertyContactService.prepare(result.data));
  } catch (error) {
    if (error instanceof ContactError) return errorResponse(error.status, error.message);
    // Não registrar dados pessoais, chave ou resposta do provedor.
    return errorResponse(500, "Não foi possível preparar a solicitação. Tente novamente mais tarde.");
  }
}
