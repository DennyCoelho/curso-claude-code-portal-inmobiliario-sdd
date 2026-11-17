import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth/page-access";

export const metadata: Metadata = { title: "Administração" };

export default async function AdminPage() {
  await requirePageUser("ADMIN");
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Administração</h1>
      <p className="leading-7 text-slate-700">Seu acesso à área administrativa está confirmado.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/account" prefetch={false} className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Minha conta</Link>
        <Link href="/login" prefetch={false} className="inline-flex min-h-11 items-center px-3 font-semibold text-emerald-800 underline underline-offset-4">Gerenciar sessão</Link>
      </div>
    </div>
  );
}
