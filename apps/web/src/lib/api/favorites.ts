import { FAVORITES_PAGE_SIZE, favoritePropertyIdSchema, favoriteResponseSchema, type FavoritePage } from "@portal-inmobiliario/contracts/favorites";
import { z } from "zod";
import { propertyListItemSchema } from "./properties";
import type { PropertyCardData } from "../property";

const favoritesSchema = z.object({ items: z.array(propertyListItemSchema.omit({ isFeatured: true })).max(FAVORITES_PAGE_SIZE),
  total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.literal(FAVORITES_PAGE_SIZE), totalPages: z.number().int().nonnegative(),
}).superRefine((value, context) => {
  const pages = Math.ceil(value.total / FAVORITES_PAGE_SIZE);
  if (value.totalPages !== pages || value.page > Math.max(1, pages)
    || value.items.length !== Math.min(FAVORITES_PAGE_SIZE, Math.max(0, value.total - (value.page - 1) * FAVORITES_PAGE_SIZE))) {
    context.addIssue({ code: "custom", message: "Paginação incompatível." });
  }
});

export class FavoriteRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request(path: string, method: "GET" | "POST" | "DELETE") {
  let response: Response;
  try {
    response = await fetch(path, { method, credentials: "same-origin", cache: "no-store",
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new FavoriteRequestError(0, "Não foi possível confirmar a operação. Verifique sua conexão e tente novamente.");
  }
  if (response.status === 401) throw new FavoriteRequestError(401, "Sua sessão terminou. Entre novamente para gerenciar seus favoritos.");
  if (response.status === 404) throw new FavoriteRequestError(404, "Este imóvel não está mais disponível.");
  if (!response.ok) throw new FavoriteRequestError(response.status, "Não foi possível atualizar seus favoritos. Tente novamente.");
  return response;
}

export async function fetchFavoriteIds(): Promise<string[]> {
  const response = await request("/api/favorites/ids", "GET");
  try { return z.array(z.uuid()).parse(await response.json()); }
  catch { throw new FavoriteRequestError(0, "Não foi possível carregar seus favoritos. Tente novamente."); }
}

export async function fetchFavorites(parameters = ""): Promise<FavoritePage<PropertyCardData>> {
  const response = await request(`/api/favorites${parameters ? `?${parameters}` : ""}`, "GET");
  try { return favoritesSchema.parse(await response.json()); }
  catch { throw new FavoriteRequestError(0, "Não foi possível carregar seus favoritos. Tente novamente."); }
}

export async function changeFavorite(value: string, save: boolean) {
  const propertyId = favoritePropertyIdSchema.parse(value);
  const response = await request(`/api/favorites/${propertyId}`, save ? "POST" : "DELETE");
  if (!save && response.status === 204) return;
  if (save) {
    try {
      const result = favoriteResponseSchema.parse(await response.json());
      if (result.propertyId.toLowerCase() === propertyId) return;
    } catch { /* Respostas incompatíveis não confirmam a operação. */ }
  }
  throw new FavoriteRequestError(0, "Não foi possível confirmar a alteração dos favoritos. Tente novamente.");
}
