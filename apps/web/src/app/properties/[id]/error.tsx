"use client";

import Link from "next/link";

export default function PropertyError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert" className="max-w-2xl space-y-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">Não foi possível carregar o imóvel</h1>
      <p className="text-base leading-7 text-amber-950">Ocorreu uma falha temporária. Tente novamente em instantes.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={retry} className="min-h-11 rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white hover:bg-emerald-900">Tentar novamente</button>
        <Link href="/properties" className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-emerald-900 underline underline-offset-4 hover:bg-amber-100">Voltar aos imóveis</Link>
      </div>
    </div>
  );
}
