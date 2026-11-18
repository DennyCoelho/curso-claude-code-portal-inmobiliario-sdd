import { jsonResponse } from "@/lib/api/response";
import { withAuthorization } from "@/lib/auth/authorization";
import { favoriteService } from "@/services/favorite-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ propertyId: string }> };

export function POST(request: Request, context: Context) {
  return withAuthorization(request, "USER", async (user) => {
    const { propertyId } = await context.params;
    return jsonResponse(await favoriteService.add(user.id, propertyId));
  });
}

export function DELETE(request: Request, context: Context) {
  return withAuthorization(request, "USER", async (user) => {
    const { propertyId } = await context.params;
    await favoriteService.remove(user.id, propertyId);
    return new Response(null, { status: 204 });
  });
}
