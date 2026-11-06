import { z } from "zod";
import type { PropertyListItem } from "../property";

// Validar os campos públicos usados pela landing e pelo catálogo.
const propertiesSchema = z.array(z.object({
  id: z.uuid(),
  title: z.string().min(1),
  operation: z.enum(["SALE", "RENT"]),
  type: z.enum(["HOUSE", "APARTMENT", "LAND", "OFFICE", "COMMERCIAL", "OTHER"]),
  price: z.string().regex(/^\d+\.\d{2}$/),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string().length(2),
  isFeatured: z.boolean(),
  bedrooms: z.number().int().nonnegative().nullable(),
  bathrooms: z.number().int().nonnegative().nullable(),
  usableArea: z.string().regex(/^\d+\.\d{2}$/).nullable(),
  totalArea: z.string().regex(/^\d+\.\d{2}$/).nullable(),
  images: z.array(z.object({
    id: z.uuid(),
    url: z.string(),
    position: z.number().int().nonnegative(),
    isMain: z.boolean(),
  })),
})) satisfies z.ZodType<PropertyListItem[]>;

export async function fetchPublicProperties(url: string): Promise<PropertyListItem[]> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error("Resposta indisponível.");

    return propertiesSchema.parse(await response.json());
  } catch {
    throw new Error("Não foi possível carregar os imóveis.");
  }
}
