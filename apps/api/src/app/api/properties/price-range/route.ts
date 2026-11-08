import { parsePropertyFilters } from "@/lib/api/property-filters";
import { errorResponse, internalErrorResponse, jsonResponse } from "@/lib/api/response";
import { publicPropertyService } from "@/services/public-property-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const parameters = new URLSearchParams();
    for (const operation of new URL(request.url).searchParams.getAll("operation")) parameters.append("operation", operation);
    const result = parsePropertyFilters(parameters);
    if (!result.success) return errorResponse(400, result.message);
    return jsonResponse(await publicPropertyService.priceRange(result.filters.operation));
  } catch (error) {
    return internalErrorResponse(error);
  }
}
