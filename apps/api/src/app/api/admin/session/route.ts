import { jsonResponse } from "@/lib/api/response";
import { withAuthorization } from "@/lib/auth/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withAuthorization(request, "ADMIN", (user) => jsonResponse({ user }));
}
