import type { Metadata } from "next";
import { EmailConfirmationPanel } from "@/components/account/confirm-email";

export const metadata: Metadata = { title: "Confirmar e-mail", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function ConfirmEmailPage() {
  return <div className="max-w-2xl space-y-5">
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Confirmar e-mail</h1>
    <EmailConfirmationPanel />
  </div>;
}
