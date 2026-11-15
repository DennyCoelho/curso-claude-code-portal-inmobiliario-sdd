import { handleAuth } from "@/lib/auth/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleAuth("me", request);
}
