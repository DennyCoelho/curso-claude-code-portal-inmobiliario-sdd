import "server-only";
import { z } from "zod";
import { AuthError } from "./error";

export const RECOVERY_UNAVAILABLE = "A recuperação de senha está temporariamente indisponível. Tente novamente mais tarde.";

export function recoveryEmailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  let origin: URL;
  try {
    origin = new URL(process.env.WEB_URL ?? "");
  } catch {
    throw new AuthError(503, RECOVERY_UNAVAILABLE);
  }
  const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (!apiKey || !z.email().safeParse(from).success || origin.username || origin.password ||
    origin.pathname !== "/" || origin.search || origin.hash || (origin.protocol !== "https:" && !(local && origin.protocol === "http:"))) {
    throw new AuthError(503, RECOVERY_UNAVAILABLE);
  }
  return { apiKey, from: from!, origin: origin.origin };
}

export async function sendRecoveryEmail(configuration: ReturnType<typeof recoveryEmailConfiguration>, email: string, token: string) {
  const link = new URL("/reset-password", configuration.origin);
  link.hash = new URLSearchParams({ token }).toString();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${configuration.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Portal Imobiliário <${configuration.from}>`,
        to: [email],
        subject: "Redefina sua senha — Portal Imobiliário",
        text: `Recebemos uma solicitação para redefinir sua senha.\n\nAcesse o link abaixo em até 30 minutos:\n${link.href}\n\nO link pode ser usado uma única vez. Se você não fez esta solicitação, ignore este e-mail. Sua senha permanece a mesma.`,
      }),
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
    if (!response.ok || !z.object({ id: z.string().min(1) }).safeParse(await response.json()).success) throw new Error();
  } catch {
    throw new AuthError(503, RECOVERY_UNAVAILABLE);
  }
}
