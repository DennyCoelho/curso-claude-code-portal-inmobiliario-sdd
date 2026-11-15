import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Criar conta</h1>
      <p className="text-base leading-7 text-slate-600">Cadastre seus dados para acessar o Portal Imobiliário.</p>
      <AuthPanel mode="register" />
    </div>
  );
}
