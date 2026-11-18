import { z } from "zod";
import type { PublicProperty } from "./public-property";

export const favoritePropertyIdSchema = z.uuid().transform((value) => value.toLowerCase());
export const favoriteResponseSchema = z.object({ propertyId: z.uuid(), isFavorite: z.literal(true) });

export const FAVORITES_PAGE_SIZE = 9;
export const favoriteSortLabels = {
  saved_desc: "Salvos recentemente", saved_asc: "Salvos há mais tempo",
  price_asc: "Menor preço", price_desc: "Maior preço",
} as const;
export const favoriteQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  search: z.string().trim().max(200, "Use até 200 caracteres na busca.").default(""),
  operation: z.enum(["", "SALE", "RENT"]).default(""),
  type: z.enum(["", "HOUSE", "APARTMENT", "LAND", "OFFICE", "COMMERCIAL", "OTHER"]).default(""),
  sort: z.enum(["saved_desc", "saved_asc", "price_asc", "price_desc"]).default("saved_desc"),
});
export type FavoriteQuery = z.infer<typeof favoriteQuerySchema>;
export const favoriteQueryNames = ["page", "search", "operation", "type", "sort"] as const;
export function readFavoriteQuery(parameters: { getAll(name: string): string[]; get(name: string): string | null }) {
  if (favoriteQueryNames.some((name) => parameters.getAll(name).length > 1)) {
    return { success: false as const, message: "Informe apenas um valor por filtro e página." };
  }
  const input = Object.fromEntries(favoriteQueryNames.map((name) => [name, parameters.get(name)?.trim() || undefined]));
  const parsed = favoriteQuerySchema.safeParse(input);
  return parsed.success ? { success: true as const, query: parsed.data }
    : { success: false as const, message: "Confira a página, a busca (até 200 caracteres), a operação, o tipo e a ordenação dos favoritos." };
}
export interface FavoritePage<T = PublicProperty> {
  items: T[];
  total: number;
  page: number;
  pageSize: typeof FAVORITES_PAGE_SIZE;
  totalPages: number;
}
