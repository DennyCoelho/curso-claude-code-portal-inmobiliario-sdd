"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useAuth } from "@/hooks/use-auth";
import { changeFavorite, FavoriteRequestError, fetchFavoriteIds } from "@/lib/api/favorites";
import type { PropertyCardData } from "@/lib/property";

interface FavoritesState {
  userId: string | null;
  loading: boolean;
  refreshing: boolean;
  error: Error | undefined;
  ids: string[] | undefined;
  handleError: (error: Error) => void;
  pending: ReadonlySet<string>;
  retry: () => Promise<unknown>;
  change: (property: PropertyCardData, save: boolean, onConfirmed?: () => void) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesState | null>(null);
export const useFavorites = () => useContext(FavoritesContext);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { mutate: mutateCache } = useSWRConfig();
  const userId = !auth.error && auth.data ? auth.data.id : null;
  function handleError(error: Error) {
    if (error instanceof FavoriteRequestError && error.status === 401) {
      void auth.mutate((current) => current?.id === userId ? null : current, { revalidate: false });
    }
  }
  const favorites = useSWR(userId ? ["/api/favorites/ids", userId] : null, fetchFavoriteIds, {
    shouldRetryOnError: false,
    revalidateOnFocus: true,
    onError: handleError,
  });
  const running = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  async function change(property: PropertyCardData, save: boolean, onConfirmed?: () => void) {
    if (!userId || auth.error || favorites.error || !favorites.data) return false;
    const operation = `${userId}:${property.id}`;
    if (running.current.has(operation)) return false;
    running.current.add(operation);
    setPending(new Set(running.current));
    try {
      await changeFavorite(property.id, save);
      onConfirmed?.();
      // Atualizar somente depois da confirmação; a chave mantém o cache por conta.
      await mutateCache<string[]>(["/api/favorites/ids", userId], (current = []) => save
        ? [...new Set([...current, property.id])]
        : current.filter((id) => id !== property.id), { revalidate: false });
      // A escrita já foi confirmada. Falha de recarga é tratada pela listagem.
      void mutateCache((key) => Array.isArray(key) && key[0] === "/api/favorites" && key[1] === userId).catch(() => {});
      return true;
    } catch (error) {
      if (error instanceof FavoriteRequestError && error.status === 401) {
        await auth.mutate((current) => current?.id === userId ? null : current, { revalidate: false });
      }
      throw error;
    } finally {
      running.current.delete(operation);
      setPending(new Set(running.current));
    }
  }

  return <FavoritesContext.Provider value={{ userId, loading: auth.isLoading || favorites.isLoading,
    refreshing: favorites.isValidating && !favorites.isLoading,
    error: auth.error || favorites.error, ids: userId ? favorites.data : undefined, pending, handleError,
    retry: () => auth.error ? auth.mutate() : favorites.mutate(), change }}>{children}</FavoritesContext.Provider>;
}
