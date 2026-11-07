import { parsePropertySearch } from "@/lib/api/property-search";
import { errorResponse, internalErrorResponse, jsonResponse } from "@/lib/api/response";
import { publicPropertyService } from "@/services/public-property-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const result = parsePropertySearch(new URL(request.url).searchParams);
    if (!result.success) return errorResponse(400, result.message);

    return jsonResponse(await publicPropertyService.list(result.search));
  } catch (error) {
    return internalErrorResponse(error);
  }
}
