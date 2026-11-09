"use client";

import { usePublicProperties } from "@/hooks/use-public-properties";
import { buildPublicPropertiesUrl, parseCatalogSearch } from "@/lib/property-search";
import { parseCatalogFilters } from "@/lib/property-filters";
import { parseCatalogSort } from "@/lib/property-sort";
import { PropertyCatalogResults } from "./property-catalog-results";

export function PropertyCatalog({ parameters = "" }: { parameters?: string }) {
  const result = parseCatalogSearch(parameters);
  const filters = parseCatalogFilters(parameters);
  const sort = parseCatalogSort(parameters);
  const { data, error, isLoading, mutate } = usePublicProperties(
    result.success && filters.success && sort.success ? buildPublicPropertiesUrl(result.search, filters.filters, sort.sort) : null,
  );

  if (!result.success) {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">{result.message} Corrija o campo ou limpe a busca para continuar.</p>;
  }
  if (!filters.success) {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">{filters.message} Corrija os campos ou limpe os filtros para continuar.</p>;
  }
  if (!sort.success) {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">{sort.message} Escolha uma opção em Ordenar por e clique em Ordenar para continuar.</p>;
  }

  return (
    <PropertyCatalogResults
      properties={data ?? []}
      status={isLoading || (data === undefined && !error) ? "loading" : error ? "error" : "ready"}
      onRetry={() => void mutate()}
      search={result.search}
      filtered={Object.keys(filters.filters).length > 0}
    />
  );
}
