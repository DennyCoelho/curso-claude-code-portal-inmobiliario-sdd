import { internalErrorResponse, jsonResponse } from "@/lib/api/response";
import { publicPropertyService } from "@/services/public-property-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    return jsonResponse(await publicPropertyService.list());
  } catch (error) {
    return internalErrorResponse(error);
  }
}
