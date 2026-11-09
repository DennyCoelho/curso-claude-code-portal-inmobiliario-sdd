import Link from "next/link";

export default function PropertyNotFound() {
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Imóvel não encontrado</h1>
      <p className="text-base leading-7 text-slate-600">Este imóvel não está disponível. Explore outras oportunidades no catálogo.</p>
      <Link href="/properties" className="inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white hover:bg-emerald-900">Ver imóveis disponíveis</Link>
    </div>
  );
}
