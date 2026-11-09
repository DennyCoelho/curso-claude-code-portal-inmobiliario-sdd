import { parsePropertySearch } from "@/lib/api/property-search";
import { parsePropertyFilters } from "@/lib/api/property-filters";
import { parsePropertySort } from "@/lib/api/property-sort";
import { errorResponse, internalErrorResponse, jsonResponse } from "@/lib/api/response";
import { publicPropertyService } from "@/services/public-property-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const parameters = new URL(request.url).searchParams;
    const result = parsePropertySearch(parameters);
    if (!result.success) return errorResponse(400, result.message);
    const filters = parsePropertyFilters(parameters);
    if (!filters.success) return errorResponse(400, filters.message);
    const sort = parsePropertySort(parameters);
    if (!sort.success) return errorResponse(400, sort.message);

    return jsonResponse(await publicPropertyService.list(result.search, filters.filters, sort.sort));
  } catch (error) {
    return internalErrorResponse(error);
  }
}
