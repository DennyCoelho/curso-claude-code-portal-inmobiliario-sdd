import { handlePasswordRecovery } from "@/lib/auth/recovery-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handlePasswordRecovery("reset-password", request);
}
