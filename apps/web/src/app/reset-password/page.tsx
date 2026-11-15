import type { Metadata } from "next";
import { ResetPasswordPanel } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Redefinir senha", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Redefinir senha</h1>
      <p className="text-base leading-7 text-slate-600">Defina sua nova senha para voltar a acessar sua conta.</p>
      <ResetPasswordPanel />
    </div>
  );
}
