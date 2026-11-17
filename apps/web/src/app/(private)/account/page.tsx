import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth/page-access";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const user = await requirePageUser();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Minha conta</h1>
      <p className="leading-7 text-slate-700">Seu acesso à área privada está confirmado.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/properties" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Explorar imóveis</Link>
        {user.role === "ADMIN" ? <Link href="/admin" prefetch={false} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Administração</Link> : null}
        <Link href="/login" prefetch={false} className="inline-flex min-h-11 items-center px-3 font-semibold text-emerald-800 underline underline-offset-4">Gerenciar sessão</Link>
      </div>
    </div>
  );
}
