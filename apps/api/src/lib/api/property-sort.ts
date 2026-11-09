import type { PublicPropertySort } from "@portal-inmobiliario/contracts/public-property";

const sortValues: readonly PublicPropertySort[] = ["recent", "price_asc", "price_desc", "area_asc", "area_desc"];

export function parsePropertySort(parameters: URLSearchParams):
  | { success: true; sort: PublicPropertySort }
  | { success: false; message: string } {
  const values = parameters.getAll("sort");
  if (values.length > 1) return { success: false, message: "Selecione apenas uma ordenação." };
  const value = values[0]?.trim() || "recent";
  const sort = sortValues.find((sort) => sort === value);
  return sort
    ? { success: true, sort }
    : { success: false, message: "Selecione uma ordenação válida." };
}
