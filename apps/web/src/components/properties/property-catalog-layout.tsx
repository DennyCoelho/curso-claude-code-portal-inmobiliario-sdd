"use client";

import { useState, type ReactNode } from "react";
import { PropertyCatalogFilters } from "./property-catalog-filters";
import { PropertyCatalogSort } from "./property-catalog-sort";

export function PropertyCatalogLayout({ parameters, children }: { parameters: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section aria-label="Catálogo e filtros" className="space-y-5">
      <div className="flex flex-col items-stretch justify-between gap-4 xl:flex-row xl:items-center">
        <button type="button" aria-expanded={expanded} aria-controls="catalog-filter-sidebar" onClick={() => setExpanded((value) => !value)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5"><path d="M4 5h16M7 12h10M10 19h4" /></svg>
          {expanded ? "Recolher filtros" : "Expandir filtros"}
        </button>
        <PropertyCatalogSort key={parameters} parameters={parameters} />
      </div>
      <div className={expanded ? "catalog-with-sidebar grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]" : "grid min-w-0 gap-6"}>
        <aside id="catalog-filter-sidebar" aria-label="Filtros de imóveis" hidden={!expanded} className="min-w-0">
          <PropertyCatalogFilters key={parameters} parameters={parameters} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
