import { z } from "zod";

export const propertySearchSchema = z.string().trim().max(200, "Use até 200 caracteres na busca.");
export const catalogSearchSchema = z.object({ search: propertySearchSchema });
export type CatalogSearchValues = z.infer<typeof catalogSearchSchema>;

export function parseCatalogSearch(parameters: string) {
  const values = new URLSearchParams(parameters).getAll("search");
  if (values.length > 1) {
    return { success: false as const, message: "Informe apenas um termo de busca." };
  }

  const result = propertySearchSchema.safeParse(values[0] ?? "");
  return result.success
    ? { success: true as const, search: result.data }
    : { success: false as const, message: result.error.issues[0].message };
}

export function buildCatalogSearchUrl(search: string, currentParameters = ""): string {
  const parameters = new URLSearchParams(currentParameters);
  const normalizedSearch = propertySearchSchema.parse(search);
  parameters.delete("search");
  if (normalizedSearch) parameters.set("search", normalizedSearch);

  const query = parameters.toString();
  return query ? `/properties?${query}` : "/properties";
}

export function buildPublicPropertiesUrl(search: string): string {
  const normalizedSearch = propertySearchSchema.parse(search);
  const query = new URLSearchParams({ search: normalizedSearch });
  return normalizedSearch ? `/api/properties?${query}` : "/api/properties";
}
