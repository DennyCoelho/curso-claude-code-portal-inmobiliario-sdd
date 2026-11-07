import { z } from "zod";
import { propertySearchSchema } from "./property-search";

export const homeSearchSchema = z.object({
  search: propertySearchSchema,
  operation: z.enum(["", "SALE", "RENT"]),
});

export type HomeSearchValues = z.infer<typeof homeSearchSchema>;

export function buildHomeSearchUrl(values: HomeSearchValues): string {
  const { search, operation } = homeSearchSchema.parse(values);
  const parameters = new URLSearchParams();

  if (search) parameters.set("search", search);
  if (operation) parameters.set("operation", operation);

  const query = parameters.toString();
  return query ? `/properties?${query}` : "/properties";
}
