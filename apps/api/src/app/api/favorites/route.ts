import { jsonResponse } from "@/lib/api/response";
import { withAuthorization } from "@/lib/auth/authorization";
import { favoriteService } from "@/services/favorite-service";
import { readFavoriteQuery } from "@portal-inmobiliario/contracts/favorites";
import { AuthError } from "@/lib/auth/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withAuthorization(request, "USER", async (user) => {
    const parsed = readFavoriteQuery(new URL(request.url).searchParams);
    if (!parsed.success) throw new AuthError(400, parsed.message);
    return jsonResponse(await favoriteService.list(user.id, parsed.query));
  });
}
