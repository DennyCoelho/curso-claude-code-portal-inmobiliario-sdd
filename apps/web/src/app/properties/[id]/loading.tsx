export default function PropertyLoading() {
  return (
    <section aria-label="Detalhes do imóvel" aria-busy="true" className="space-y-8">
      <p role="status" className="text-sm text-slate-600">Carregando imóvel…</p>
      <div aria-hidden="true" className="space-y-8 motion-safe:animate-pulse">
        <div className="h-10 w-3/4 rounded-lg bg-slate-200" />
        <div className="h-5 w-1/2 rounded bg-slate-200" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="aspect-[4/3] rounded-2xl bg-slate-200" />
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="h-7 w-2/3 rounded bg-slate-200" />
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-6 w-3/4 rounded bg-slate-100" />)}
          </div>
        </div>
      </div>
    </section>
  );
}
