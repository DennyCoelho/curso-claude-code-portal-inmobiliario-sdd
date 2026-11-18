"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useFavorites } from "./favorites-provider";
import { FavoriteFilters } from "./favorite-filters";
import { FavoritePagination } from "./favorite-pagination";
import { PropertyGrid } from "@/components/properties/property-grid";
import { PropertyGridSkeleton } from "@/components/properties/property-grid-skeleton";
import { LoadingStatus } from "@/components/ui/loading-feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { fetchFavorites } from "@/lib/api/favorites";
import { favoriteQuerySchema } from "@portal-inmobiliario/contracts/favorites";
import { buildAccountFavoritesUrl, buildFavoritesQuery, parseAccountFavorites } from "@/lib/favorites";
import { usePendingNavigation } from "@/hooks/use-pending-navigation";

export function AccountFavorites({ parameters = "" }: { parameters?: string }) {
  const favorites = useFavorites();
  return <section aria-labelledby="account-favorites-title" className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
    <h2 id="account-favorites-title" tabIndex={-1} className="text-xl font-semibold tracking-tight">Imóveis de interesse</h2>
    <p className="leading-7 text-slate-600">Seus imóveis salvos aparecem aqui enquanto estiverem disponíveis.</p>
    {favorites?.loading ? <LoadingStatus>Carregando seus favoritos…</LoadingStatus> : favorites?.error ? (
      <div className="space-y-3"><p role="alert">Não foi possível carregar seus favoritos.</p><RetryButton onRetry={favorites.retry} className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold" /></div>
    ) : !favorites?.userId ? <Link href="/login?next=%2Faccount" prefetch={false} className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4">Entre na sua conta para ver seus favoritos</Link>
      : <FavoriteResults key={`${favorites.userId}:${parameters}`} parameters={parameters} />}
  </section>;
}

function FavoriteResults({ parameters }: { parameters: string }) {
  const favorites = useFavorites()!;
  const router = useRouter();
  const { isNavigating, navigate } = usePendingNavigation();
  const parsed = parseAccountFavorites(parameters);
  const query = parsed.success ? parsed.query : favoriteQuerySchema.parse({});
  const serialized = buildFavoritesQuery(query);
  const page = useSWR(parsed.success ? ["/api/favorites", favorites.userId, serialized] : null, () => fetchFavorites(serialized), {
    shouldRetryOnError: false, onError: favorites.handleError,
  });
  const result = page.data;
  const correctedUrl = result && result.page !== query.page ? buildAccountFavoritesUrl({ ...query, page: result.page }, parameters) : null;
  useEffect(() => {
    if (correctedUrl && !page.error) router.replace(correctedUrl, { scroll: false });
  }, [correctedUrl, page.error, router]);
  const filtered = !!(query.search || query.operation || query.type);
  return <div className="space-y-5" aria-busy={isNavigating || page.isLoading}>
    <FavoriteFilters query={query} pending={isNavigating} onApply={(values) => navigate(buildAccountFavoritesUrl(values, parameters), { scroll: false })} />
    {isNavigating ? <LoadingStatus>Atualizando a seleção de favoritos…</LoadingStatus> : null}
    {!parsed.success ? <p role="alert">{parsed.message} Use os filtros acima para corrigir a seleção.</p>
      : page.isLoading ? <><LoadingStatus>Carregando seus favoritos…</LoadingStatus><PropertyGridSkeleton /></>
      : page.error ? <div className="space-y-3"><p role="alert">Não foi possível carregar seus favoritos.</p><RetryButton onRetry={() => page.mutate()} className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold" /></div>
      : result?.items.length ? <>
        <p role="status" className="text-sm text-slate-600">{(result.page - 1) * result.pageSize + 1}–{(result.page - 1) * result.pageSize + result.items.length} de {result.total} {result.total === 1 ? "imóvel salvo" : "imóveis salvos"}</p>
        <PropertyGrid properties={result.items} />
      </> : <div className="space-y-3"><p role="status">{filtered ? "Nenhum favorito corresponde aos filtros selecionados." : "Você ainda não tem imóveis favoritos disponíveis."}</p><Link href="/properties" className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4">Explorar imóveis para salvar</Link></div>}
    {result && !page.error ? <FavoritePagination query={{ ...query, page: result.page }} totalPages={result.totalPages} parameters={parameters} onPage={(value) => navigate(buildAccountFavoritesUrl({ ...query, page: value }, parameters), { scroll: false })} /> : null}
    {page.isValidating && !page.isLoading ? <LoadingStatus>Atualizando seus favoritos…</LoadingStatus> : null}
  </div>;
}
