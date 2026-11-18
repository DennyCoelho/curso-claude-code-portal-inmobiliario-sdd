import "server-only";
import { favoritePropertyIdSchema, favoriteQuerySchema, type FavoriteQuery, type FavoritePage } from "@portal-inmobiliario/contracts/favorites";
import { AuthError } from "@/lib/auth/error";
import { createFavoriteRepository, type FavoriteRepository } from "@/repositories/favorite-repository";
import { serializePublicProperty } from "./public-property-service";

function parsePropertyId(value: string) {
  const parsed = favoritePropertyIdSchema.safeParse(value);
  if (!parsed.success) throw new AuthError(400, "Identificador de imóvel inválido.");
  return parsed.data;
}

export function createFavoriteService(repository: FavoriteRepository = createFavoriteRepository()) {
  return {
    async ids(userId: string) { return repository.ids(userId); },
    async list(userId: string, query: FavoriteQuery = favoriteQuerySchema.parse({})): Promise<FavoritePage> {
      const result = await repository.list(userId, favoriteQuerySchema.parse(query));
      return { ...result, items: result.items.map(serializePublicProperty) };
    },
    async add(userId: string, value: string) {
      const propertyId = parsePropertyId(value);
      if (!await repository.add(userId, propertyId)) throw new AuthError(404, "Imóvel indisponível.");
      return { propertyId, isFavorite: true as const };
    },
    async remove(userId: string, value: string) {
      await repository.remove(userId, parsePropertyId(value));
    },
  };
}

export const favoriteService = createFavoriteService();
