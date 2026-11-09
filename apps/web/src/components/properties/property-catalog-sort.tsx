"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { buildCatalogSortUrl, catalogSortSchema, parseCatalogSort, propertySortLabels, type CatalogSortValues } from "@/lib/property-sort";

export function PropertyCatalogSort({ parameters }: { parameters: string }) {
  const router = useRouter();
  const result = parseCatalogSort(parameters);
  const sort = result.success ? result.sort : "recent";
  const { register, handleSubmit, formState: { errors } } = useForm<CatalogSortValues>({
    resolver: zodResolver(catalogSortSchema), defaultValues: { sort },
  });

  return (
    <form action="/properties" method="get" aria-label="Ordenar imóveis"
      onSubmit={handleSubmit(({ sort }) => router.push(buildCatalogSortUrl(sort, parameters), { scroll: false }))}
      className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      {Array.from(new URLSearchParams(parameters)).filter(([name]) => name !== "sort").map(([name, value], index) => (
        <input key={`${name}-${index}`} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="catalog-sort" className="shrink-0 text-sm font-semibold text-slate-900">Ordenar por</label>
      <div className="flex min-w-0 gap-2">
        <select {...register("sort")} id="catalog-sort" defaultValue={sort}
          aria-invalid={Boolean(errors.sort)} aria-describedby={errors.sort ? "catalog-sort-error" : undefined}
          className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 sm:w-auto">
          {Object.entries(propertySortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" className="min-h-11 shrink-0 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900">Ordenar</button>
      </div>
      {errors.sort ? <p id="catalog-sort-error" role="alert" className="text-sm text-red-700">{errors.sort.message}</p> : null}
    </form>
  );
}
