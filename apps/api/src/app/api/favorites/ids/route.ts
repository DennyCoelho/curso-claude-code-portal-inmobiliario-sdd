import { jsonResponse } from "@/lib/api/response";
import { withAuthorization } from "@/lib/auth/authorization";
import { favoriteService } from "@/services/favorite-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return withAuthorization(request, "USER", async (user) => jsonResponse(await favoriteService.ids(user.id)));
}
