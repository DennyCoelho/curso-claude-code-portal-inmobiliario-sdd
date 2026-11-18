import { handleAccount } from "@/lib/auth/account-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (request: Request) => handleAccount("email-change", request);
