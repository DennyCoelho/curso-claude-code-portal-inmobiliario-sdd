import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Entrar</h1>
      <p className="text-base leading-7 text-slate-600">
        Entre com seu e-mail e sua senha para continuar.
      </p>
      <AuthPanel mode="login" />
    </div>
  );
}
