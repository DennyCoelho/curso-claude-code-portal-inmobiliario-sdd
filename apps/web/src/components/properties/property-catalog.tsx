"use client";

import { usePublicProperties } from "@/hooks/use-public-properties";
import { buildPublicPropertiesUrl, parseCatalogSearch } from "@/lib/property-search";
import { parseCatalogFilters } from "@/lib/property-filters";
import { PropertyCatalogResults } from "./property-catalog-results";

export function PropertyCatalog({ parameters = "" }: { parameters?: string }) {
  const result = parseCatalogSearch(parameters);
  const filters = parseCatalogFilters(parameters);
  const { data, error, isLoading, mutate } = usePublicProperties(
    result.success && filters.success ? buildPublicPropertiesUrl(result.search, filters.filters) : null,
  );

  if (!result.success) {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">{result.message} Corrija o campo ou limpe a busca para continuar.</p>;
  }
  if (!filters.success) {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">{filters.message} Corrija os campos ou limpe os filtros para continuar.</p>;
  }

  return (
    <PropertyCatalogResults
      properties={data ?? []}
      status={isLoading ? "loading" : error ? "error" : "ready"}
      onRetry={() => void mutate()}
      search={result.search}
      filtered={Object.keys(filters.filters).length > 0}
    />
  );
}
