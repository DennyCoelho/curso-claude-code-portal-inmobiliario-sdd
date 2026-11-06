"use client";

import { usePublicProperties } from "@/hooks/use-public-properties";
import { PropertyCatalogResults } from "./property-catalog-results";

export function PropertyCatalog() {
  const { data, error, isLoading, mutate } = usePublicProperties();

  return (
    <PropertyCatalogResults
      properties={data ?? []}
      status={isLoading ? "loading" : error ? "error" : "ready"}
      onRetry={() => void mutate()}
    />
  );
}
