import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Acesso restrito" };

export default function AccessDeniedPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Acesso restrito</h1>
      <p className="leading-7 text-slate-700">Você não tem permissão para acessar a área administrativa.</p>
      <Link href="/account" prefetch={false} className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Ir para minha conta</Link>
    </div>
  );
}
