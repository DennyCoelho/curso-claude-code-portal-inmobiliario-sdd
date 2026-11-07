"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  buildCatalogSearchUrl,
  catalogSearchSchema,
  type CatalogSearchValues,
} from "@/lib/property-search";

export function PropertyCatalogSearch({ parameters }: { parameters: string }) {
  const router = useRouter();
  const currentParameters = new URLSearchParams(parameters);
  const search = currentParameters.get("search") ?? "";
  const { register, handleSubmit, formState: { errors } } = useForm<CatalogSearchValues>({
    resolver: zodResolver(catalogSearchSchema),
    defaultValues: { search },
  });

  return (
    <form
      role="search"
      aria-label="Buscar no catálogo"
      action="/properties"
      method="get"
      onSubmit={handleSubmit(({ search }) => router.push(buildCatalogSearchUrl(search, parameters), { scroll: false }))}
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
    >
      {Array.from(currentParameters).filter(([name]) => name !== "search").map(([name, value], index) => (
        <input key={`${name}-${index}`} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="catalog-search" className="mb-2 block text-sm font-semibold text-slate-900">
        O que você procura?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          {...register("search")}
          id="catalog-search"
          type="search"
          defaultValue={search}
          placeholder="Busque por imóvel, bairro, cidade ou UF"
          maxLength={200}
          aria-invalid={Boolean(errors.search)}
          aria-describedby={errors.search ? "catalog-search-help catalog-search-error" : "catalog-search-help"}
          className="min-h-12 w-full min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-base text-slate-900 placeholder:text-slate-500"
        />
        <button type="submit" className="min-h-12 shrink-0 rounded-lg bg-emerald-800 px-6 font-semibold text-white hover:bg-emerald-900">
          Buscar imóveis
        </button>
        {currentParameters.has("search") ? (
          <Link href={buildCatalogSearchUrl("", parameters)} scroll={false} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            Limpar busca
          </Link>
        ) : null}
      </div>
      <p id="catalog-search-help" className="mt-3 text-sm leading-6 text-slate-600">
        Pesquise por título, bairro, cidade, UF ou palavras da descrição.
      </p>
      {errors.search ? (
        <p id="catalog-search-error" role="alert" className="mt-2 text-sm text-red-700">{errors.search.message}</p>
      ) : null}
    </form>
  );
}
