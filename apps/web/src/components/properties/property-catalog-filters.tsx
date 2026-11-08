"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { propertyTypeLabels } from "@/lib/property";
import { brazilianStates, buildCatalogFiltersUrl, catalogFilterNames, catalogFiltersSchema, getCatalogFilterValues, type CatalogFilterValues } from "@/lib/property-filters";
import { PropertyPriceRange } from "./property-price-range";
import { formatPriceInput, maximumSliderPrice } from "@/lib/property-price-range";

const inputFields = [
  { name: "city", label: "Cidade", inputMode: "text" },
  { name: "neighborhood", label: "Bairro", inputMode: "text" },
] as const;
const fieldClassName = "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base font-normal text-slate-900";

export function PropertyCatalogFilters({ parameters }: { parameters: string }) {
  const router = useRouter();
  const query = new URLSearchParams(parameters);
  const values = getCatalogFilterValues(parameters);
  const { register, handleSubmit, control, formState: { errors } } = useForm<CatalogFilterValues>({
    resolver: zodResolver(catalogFiltersSchema), defaultValues: {
      ...values,
      minPrice: formatPriceInput(values.minPrice || "0"),
      maxPrice: formatPriceInput(values.maxPrice || String(maximumSliderPrice)),
    },
  });

  return (
    <form action="/properties" method="get" aria-labelledby="catalog-filters-title"
      onSubmit={handleSubmit((values) => router.push(buildCatalogFiltersUrl(values, parameters), { scroll: false }))}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      {Array.from(query).filter(([name]) => !catalogFilterNames.includes(name as keyof CatalogFilterValues)).map(([name, value], index) => (
        <input key={`${name}-${index}`} type="hidden" name={name} value={value} />
      ))}
      <div>
        <h2 id="catalog-filters-title" className="text-lg font-semibold text-slate-900">Filtrar imóveis</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Combine as opções para encontrar seu próximo espaço.</p>
      </div>
      <label htmlFor="filter-operation" className="block text-sm font-semibold text-slate-900">
        Operação
        <select {...register("operation")} id="filter-operation" defaultValue={values.operation} className={fieldClassName}
          aria-invalid={Boolean(errors.operation)} aria-describedby={errors.operation ? "filter-operation-error" : undefined}>
          <option value="">Comprar ou alugar</option><option value="SALE">Comprar</option><option value="RENT">Alugar</option>
        </select>
      </label>
      {errors.operation ? <p id="filter-operation-error" role="alert" className="text-sm text-red-700">{errors.operation.message}</p> : null}
      <fieldset className="border-t border-slate-200 pt-4" aria-describedby="filter-types-help">
        <legend className="float-left mb-1 w-full text-sm font-semibold text-slate-900">Tipo de imóvel</legend>
        <p id="filter-types-help" className="clear-both mb-2 text-xs text-slate-500">Selecione um ou mais tipos.</p>
        {Object.entries(propertyTypeLabels).map(([value, label]) => (
          <label key={value} htmlFor={`filter-type-${value}`} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-slate-700">
            <input {...register("type")} id={`filter-type-${value}`} type="checkbox" value={value} defaultChecked={values.type.includes(value as CatalogFilterValues["type"][number])}
              aria-invalid={Boolean(errors.type)} aria-describedby={errors.type ? "filter-type-error" : undefined} className="size-4 accent-emerald-700" />
            {label}
          </label>
        ))}
        {errors.type ? <p id="filter-type-error" role="alert" className="mt-2 text-sm text-red-700">{errors.type.message}</p> : null}
      </fieldset>
      <PropertyPriceRange control={control} />
      {([
        { name: "bedrooms", title: "Quartos", singular: "quarto", plural: "quartos" },
        { name: "bathrooms", title: "Banheiros", singular: "banheiro", plural: "banheiros" },
      ] as const).map(({ name, title, singular, plural }) => (
        <fieldset key={name} className="border-t border-slate-200 pt-4">
        <legend className="float-left mb-2 w-full text-sm font-semibold text-slate-900">{title}</legend>
        <div className="clear-both space-y-1">
          {[["", "Qualquer quantidade"], ["1", `1 ${singular}`], ["2", `2 ${plural}`], ["3", `3 ${plural}`], ["4+", `4 ou mais ${plural}`]].map(([value, label]) => (
            <label key={value} htmlFor={`filter-${name}-${value || "all"}`} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-slate-700">
              <input {...register(name)} id={`filter-${name}-${value || "all"}`} type="radio" value={value} defaultChecked={values[name] === value}
                aria-describedby={errors[name] ? `filter-${name}-error` : undefined} className="size-4 accent-emerald-700" />
              {label}
            </label>
          ))}
        </div>
        {errors[name] ? <p id={`filter-${name}-error`} role="alert" className="mt-2 text-sm text-red-700">{errors[name]?.message}</p> : null}
      </fieldset>
      ))}
      <div className="space-y-4 border-t border-slate-200 pt-4">
        <label htmlFor="filter-minUsableArea" className="block min-w-0 text-sm font-semibold text-slate-900">
          Área útil mínima (m²)
          <input {...register("minUsableArea")} defaultValue={values.minUsableArea} id="filter-minUsableArea" type="text" inputMode="decimal" maxLength={13}
            aria-invalid={Boolean(errors.minUsableArea)} aria-describedby={errors.minUsableArea ? "filter-minUsableArea-error" : undefined} className={fieldClassName} />
          {errors.minUsableArea ? <span id="filter-minUsableArea-error" role="alert" className="mt-2 block text-sm font-normal text-red-700">{errors.minUsableArea.message}</span> : null}
        </label>
        <label htmlFor="filter-state" className="block text-sm font-semibold text-slate-900">
          Estado (UF)
          <select {...register("state")} defaultValue={values.state} id="filter-state" className={fieldClassName} aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? "filter-state-error" : undefined}>
            <option value="">Todas as UFs</option>
            {brazilianStates.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        {errors.state ? <p id="filter-state-error" role="alert" className="text-sm text-red-700">{errors.state.message}</p> : null}
        {inputFields.map(({ name, label, inputMode }) => (
          <label key={name} htmlFor={`filter-${name}`} className="block min-w-0 text-sm font-semibold text-slate-900">
            {label}
            <input {...register(name)} defaultValue={values[name]} id={`filter-${name}`} type="text" inputMode={inputMode}
              maxLength={200}
              aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `filter-${name}-error` : undefined} className={fieldClassName} />
            {errors[name] ? <span id={`filter-${name}-error`} role="alert" className="mt-2 block text-sm font-normal text-red-700">{errors[name]?.message}</span> : null}
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-200 pt-5">
        <button type="submit" className="min-h-12 rounded-lg bg-emerald-800 px-4 font-semibold text-white hover:bg-emerald-900">Aplicar filtros</button>
        {catalogFilterNames.some((name) => query.has(name)) ? (
          <Link href={buildCatalogFiltersUrl(null, parameters)} scroll={false} className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Limpar filtros</Link>
        ) : null}
      </div>
    </form>
  );
}
