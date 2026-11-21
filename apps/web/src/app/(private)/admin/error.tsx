"use client";

import Link from "next/link";
import { RetryButton } from "@/components/ui/retry-button";

export default function AdminError({ retry }: { retry: () => void | Promise<void> }) {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Painel temporariamente indisponível</h1>
      <p role="alert" className="leading-7 text-slate-700">Não foi possível carregar os indicadores. Tente novamente em instantes.</p>
      <div className="flex flex-wrap gap-3">
        <RetryButton onRetry={retry} className="min-h-11 rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900" />
        <Link href="/account" prefetch={false} className="inline-flex min-h-11 items-center px-3 font-semibold text-emerald-800 underline underline-offset-4">Minha conta</Link>
      </div>
    </div>
  );
}
