import { z } from "zod";
import type { PublicPropertySort } from "@portal-inmobiliario/contracts/public-property";

export const propertySortLabels = {
  recent: "Mais recentes",
  price_asc: "Menor preço",
  price_desc: "Maior preço",
  area_asc: "Menor área útil",
  area_desc: "Maior área útil",
} satisfies Record<PublicPropertySort, string>;

export const catalogSortSchema = z.object({
  sort: z.enum(["recent", "price_asc", "price_desc", "area_asc", "area_desc"], { error: "Selecione uma ordenação válida." }),
});
export type CatalogSortValues = z.infer<typeof catalogSortSchema>;

export function parseCatalogSort(parameters: string) {
  const values = new URLSearchParams(parameters).getAll("sort");
  if (values.length > 1) return { success: false as const, message: "Selecione apenas uma ordenação." };
  const result = catalogSortSchema.safeParse({ sort: values[0]?.trim() || "recent" });
  return result.success
    ? { success: true as const, sort: result.data.sort }
    : { success: false as const, message: result.error.issues[0].message };
}

export function buildCatalogSortUrl(sort: PublicPropertySort, currentParameters = "") {
  const parameters = new URLSearchParams(currentParameters);
  const values = catalogSortSchema.parse({ sort });
  parameters.delete("sort");
  if (values.sort !== "recent") parameters.set("sort", values.sort);
  return parameters.size ? `/properties?${parameters}` : "/properties";
}
