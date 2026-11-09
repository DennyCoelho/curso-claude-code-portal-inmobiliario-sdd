import type { PropertyCardData } from "@/lib/property";
import { PropertyGrid } from "./property-grid";
import { PropertyGridSkeleton } from "./property-grid-skeleton";

interface PropertyCatalogResultsProps {
  properties: readonly PropertyCardData[];
  status: "loading" | "error" | "ready";
  onRetry: () => void;
  search?: string;
  filtered?: boolean;
}

export function PropertyCatalogResults({ properties, status, onRetry, search = "", filtered = false }: PropertyCatalogResultsProps) {
  return (
    <section aria-labelledby="catalog-results-title" aria-busy={status === "loading"}>
      <h2 id="catalog-results-title" className="sr-only">{search ? "Resultados da busca" : "Imóveis disponíveis"}</h2>
      {search ? <p className="mb-4 text-sm break-words text-slate-600">Resultados para: <strong className="text-slate-900">{search}</strong></p> : null}
      {status === "loading" ? (
        <div className="space-y-6">
          <p role="status" className="text-sm text-slate-600">Carregando imóveis…</p>
          <PropertyGridSkeleton />
        </div>
      ) : status === "error" ? (
        <div role="alert" className="flex flex-col items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p>Não foi possível carregar os imóveis. Tente novamente em instantes.</p>
          <button type="button" onClick={onRetry} className="min-h-11 shrink-0 rounded-lg border border-amber-300 px-4 font-semibold hover:bg-amber-100">
            Tentar novamente
          </button>
        </div>
      ) : properties.length === 0 ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white px-5 py-10">
          <p className="font-semibold text-slate-900">{filtered ? "Nenhum imóvel encontrado com estes filtros." : search ? "Nenhum imóvel encontrado para esta busca." : "Nenhum imóvel disponível no momento."}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{filtered ? "Ajuste ou limpe os filtros e a busca para ampliar os resultados." : search ? "Tente outras palavras ou limpe a busca para ver todos os imóveis." : "Novas oportunidades podem aparecer em breve. Volte para conferir."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <p role="status" className="text-sm text-slate-600">
            {properties.length} {search || filtered
              ? properties.length === 1 ? "imóvel encontrado" : "imóveis encontrados"
              : properties.length === 1 ? "imóvel disponível" : "imóveis disponíveis"}
          </p>
          <PropertyGrid properties={properties} />
        </div>
      )}
    </section>
  );
}
