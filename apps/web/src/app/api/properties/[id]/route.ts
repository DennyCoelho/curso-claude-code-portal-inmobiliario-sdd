import {
  errorResponse,
  internalErrorResponse,
  jsonResponse,
} from "@/lib/api/response";
import { publicPropertyService } from "@/services/public-property-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const propertyIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: RouteContext<"/api/properties/[id]">,
): Promise<Response> {
  try {
    const { id } = await context.params;

    if (!propertyIdPattern.test(id)) {
      return errorResponse(400, "Identificador de imóvel inválido.");
    }

    const property = await publicPropertyService.findById(id.toLowerCase());

    if (!property) {
      return errorResponse(404, "Imóvel não encontrado.");
    }

    return jsonResponse(property);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
