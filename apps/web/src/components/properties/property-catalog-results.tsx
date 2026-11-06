import type { PropertyCardData } from "@/lib/property";
import { PropertyGrid } from "./property-grid";

interface PropertyCatalogResultsProps {
  properties: readonly PropertyCardData[];
  status: "loading" | "error" | "ready";
  onRetry: () => void;
}

export function PropertyCatalogResults({ properties, status, onRetry }: PropertyCatalogResultsProps) {
  return (
    <section aria-labelledby="catalog-results-title" aria-busy={status === "loading"}>
      <h2 id="catalog-results-title" className="sr-only">Imóveis disponíveis</h2>
      {status === "loading" ? (
        <p role="status" className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-sm text-slate-600">
          Carregando imóveis…
        </p>
      ) : status === "error" ? (
        <div role="alert" className="flex flex-col items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p>Não foi possível carregar os imóveis. Tente novamente em instantes.</p>
          <button type="button" onClick={onRetry} className="min-h-11 shrink-0 rounded-lg border border-amber-300 px-4 font-semibold hover:bg-amber-100">
            Tentar novamente
          </button>
        </div>
      ) : properties.length === 0 ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white px-5 py-10">
          <p className="font-semibold text-slate-900">Nenhum imóvel disponível no momento.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Novas oportunidades podem aparecer em breve. Volte para conferir.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <p role="status" className="text-sm text-slate-600">
            {properties.length} {properties.length === 1 ? "imóvel disponível" : "imóveis disponíveis"}
          </p>
          <PropertyGrid properties={properties} />
        </div>
      )}
    </section>
  );
}
