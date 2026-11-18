"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { favoriteQuerySchema, favoriteSortLabels, type FavoriteQuery } from "@portal-inmobiliario/contracts/favorites";
import { propertyTypeLabels } from "@/lib/property";
import { ActionButton } from "@/components/ui/loading-feedback";

const filterSchema = z.object({ search: favoriteQuerySchema.shape.search.removeDefault(),
  operation: favoriteQuerySchema.shape.operation.removeDefault(), type: favoriteQuerySchema.shape.type.removeDefault(),
  sort: favoriteQuerySchema.shape.sort.removeDefault() });
type FilterValues = Omit<FavoriteQuery, "page">;
const fieldStyle = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";

export function FavoriteFilters({ query, pending, onApply }: { query: FavoriteQuery; pending: boolean; onApply: (query: FavoriteQuery) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FilterValues>({ resolver: zodResolver(filterSchema), defaultValues: query });
  return <form aria-label="Filtrar favoritos" onSubmit={handleSubmit((values) => onApply({ ...values, page: 1 }))}>
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <legend className="sr-only">Filtros dos seus favoritos</legend>
      <div className="space-y-2 sm:col-span-2 lg:col-span-4"><label htmlFor="favorites-search" className="text-sm font-medium">Buscar nos favoritos</label>
        <input id="favorites-search" type="search" maxLength={200} placeholder="Título, bairro, cidade ou palavra da descrição" {...register("search")} aria-invalid={!!errors.search} aria-describedby={errors.search ? "favorites-search-error" : undefined} className={fieldStyle} />
        {errors.search ? <p id="favorites-search-error" role="alert" className="text-sm text-red-700">{errors.search.message}</p> : null}</div>
      <div className="space-y-2"><label htmlFor="favorites-operation" className="text-sm font-medium">Operação</label><select id="favorites-operation" {...register("operation")} className={fieldStyle}><option value="">Comprar ou alugar</option><option value="SALE">Comprar</option><option value="RENT">Alugar</option></select></div>
      <div className="space-y-2"><label htmlFor="favorites-type" className="text-sm font-medium">Tipo de imóvel</label><select id="favorites-type" {...register("type")} className={fieldStyle}><option value="">Todos os tipos</option>{Object.entries(propertyTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="space-y-2"><label htmlFor="favorites-sort" className="text-sm font-medium">Ordenar por</label><select id="favorites-sort" {...register("sort")} className={fieldStyle}>{Object.entries(favoriteSortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="flex flex-wrap items-end gap-2"><ActionButton type="submit" pending={pending} pendingLabel="Aplicando…" className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">Aplicar filtros</ActionButton>
        <button type="button" onClick={() => onApply(favoriteQuerySchema.parse({}))} className="min-h-11 px-2 text-sm font-semibold text-emerald-800 underline underline-offset-4">Limpar filtros</button></div>
    </fieldset>
  </form>;
}
