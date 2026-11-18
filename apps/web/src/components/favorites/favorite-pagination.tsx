"use client";

import Link from "next/link";
import type { FavoriteQuery } from "@portal-inmobiliario/contracts/favorites";
import { buildAccountFavoritesUrl } from "@/lib/favorites";

export function FavoritePagination({ query, totalPages, parameters, onPage }: {
  query: FavoriteQuery; totalPages: number; parameters: string; onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, totalPages, query.page - 1, query.page, query.page + 1])]
    .filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  function link(value: number, label: string, numeric = false) {
    return <Link href={buildAccountFavoritesUrl({ ...query, page: value }, parameters)} prefetch={false}
      onNavigate={(event) => { event.preventDefault(); onPage(value); }}
      aria-label={numeric ? `Página ${value} dos favoritos` : undefined} aria-current={numeric && value === query.page ? "page" : undefined}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 ${numeric && value === query.page ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300"}`}>{label}</Link>;
  }
  return <nav aria-label="Paginação dos favoritos" className="flex flex-wrap items-center gap-2 text-sm">
    {query.page > 1 ? link(query.page - 1, "Anterior") : <span aria-disabled="true" className="px-3 text-slate-400">Anterior</span>}
    {pages.map((value, index) => <span key={value} className="inline-flex items-center gap-2">{index > 0 && value > pages[index - 1] + 1 ? <span aria-hidden="true">…</span> : null}{link(value, String(value), true)}</span>)}
    {query.page < totalPages ? link(query.page + 1, "Próxima") : <span aria-disabled="true" className="px-3 text-slate-400">Próxima</span>}
  </nav>;
}
