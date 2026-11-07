"use client";

import { usePublicProperties } from "@/hooks/use-public-properties";
import { buildPublicPropertiesUrl, parseCatalogSearch } from "@/lib/property-search";
import { PropertyCatalogResults } from "./property-catalog-results";

export function PropertyCatalog({ parameters = "" }: { parameters?: string }) {
  const result = parseCatalogSearch(parameters);
  const { data, error, isLoading, mutate } = usePublicProperties(
    result.success ? buildPublicPropertiesUrl(result.search) : null,
  );

  if (!result.success) {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">{result.message} Corrija o campo ou limpe a busca para continuar.</p>;
  }

  return (
    <PropertyCatalogResults
      properties={data ?? []}
      status={isLoading ? "loading" : error ? "error" : "ready"}
      onRetry={() => void mutate()}
      search={result.search}
    />
  );
}
