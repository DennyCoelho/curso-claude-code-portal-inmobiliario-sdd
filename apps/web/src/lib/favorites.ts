import { favoriteQueryNames, favoriteQuerySchema, readFavoriteQuery, type FavoriteQuery } from "@portal-inmobiliario/contracts/favorites";

const accountName = (name: string) => `favorites${name[0].toUpperCase()}${name.slice(1)}`;
const defaults = favoriteQuerySchema.parse({});
export function parseAccountFavorites(parameters: string) {
  const source = new URLSearchParams(parameters); const query = new URLSearchParams();
  for (const name of favoriteQueryNames) for (const value of source.getAll(accountName(name))) query.append(name, value);
  return readFavoriteQuery(query);
}
export function buildFavoritesQuery(query: FavoriteQuery) {
  const values = favoriteQuerySchema.parse(query); const parameters = new URLSearchParams();
  for (const name of favoriteQueryNames) if (values[name] !== defaults[name]) parameters.set(name, String(values[name]));
  return parameters.toString();
}
export function buildAccountFavoritesUrl(query: FavoriteQuery, currentParameters = "") {
  const parameters = new URLSearchParams(currentParameters);
  for (const name of favoriteQueryNames) parameters.delete(accountName(name));
  for (const [name, value] of new URLSearchParams(buildFavoritesQuery(query))) parameters.set(accountName(name), value);
  return `/account${parameters.size ? `?${parameters}` : ""}#account-favorites-title`;
}
