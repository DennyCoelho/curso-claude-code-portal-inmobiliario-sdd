import "server-only";
import { z } from "zod";
import { AuthError } from "./error";
import { recoveryEmailConfiguration } from "./recovery-email";

export const EMAIL_CHANGE_UNAVAILABLE = "A mudança de e-mail está temporariamente indisponível. Tente novamente mais tarde.";
export function emailChangeConfiguration() {
  try { return recoveryEmailConfiguration(); } catch { throw new AuthError(503, EMAIL_CHANGE_UNAVAILABLE); }
}

export async function sendEmailChange(configuration: ReturnType<typeof emailChangeConfiguration>, email: string, token: string) {
  const link = new URL("/confirm-email", configuration.origin);
  link.hash = new URLSearchParams({ token }).toString();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", redirect: "error",
      headers: { Authorization: `Bearer ${configuration.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Portal Imobiliário <${configuration.from}>`, to: [email],
        subject: "Confirme seu novo e-mail — Portal Imobiliário",
        text: `Recebemos uma solicitação para usar este endereço na sua conta.\n\nEntre na conta que solicitou a mudança e confirme pelo link em até 30 minutos:\n${link.href}\n\nO link pode ser usado uma única vez. Seu e-mail de acesso só será alterado após a confirmação. Se você não fez esta solicitação, ignore este e-mail.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !z.object({ id: z.string().min(1) }).safeParse(await response.json()).success) throw new Error();
  } catch { throw new AuthError(503, EMAIL_CHANGE_UNAVAILABLE); }
}
