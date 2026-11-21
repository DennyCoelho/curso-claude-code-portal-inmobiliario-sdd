import { errorResponse, jsonResponse } from "@/lib/api/response";
import { withAuthorization } from "@/lib/auth/authorization";
import { adminDashboardService } from "@/services/admin-dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withAuthorization(request, "ADMIN", async () => {
    try {
      return jsonResponse(await adminDashboardService.getCounts());
    } catch {
      return errorResponse(500, "Não foi possível carregar os indicadores. Tente novamente mais tarde.");
    }
  });
}
