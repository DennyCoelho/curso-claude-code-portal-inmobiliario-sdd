import { jsonResponse } from "@/lib/api/response";

export const dynamic = "force-dynamic";

// Verificar o processo HTTP sem depender da disponibilidade do PostgreSQL.
export function GET(): Response {
  return jsonResponse({ status: "ok" });
}
