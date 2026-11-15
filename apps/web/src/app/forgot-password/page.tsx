import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ForgotPasswordPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Recuperar senha</h1>
      <p className="text-base leading-7 text-slate-600">Informe o e-mail da sua conta para solicitar um link de recuperação.</p>
      <ForgotPasswordForm />
    </div>
  );
}
