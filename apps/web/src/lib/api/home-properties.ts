import { z } from "zod";
import type { HomeProperty } from "../home";

// Validar somente os campos usados nas seleções da página inicial.
const homePropertiesSchema = z.array(z.object({
  id: z.uuid(),
  title: z.string().min(1),
  operation: z.enum(["SALE", "RENT"]),
  type: z.enum(["HOUSE", "APARTMENT", "LAND", "OFFICE", "COMMERCIAL", "OTHER"]),
  price: z.string().regex(/^\d+\.\d{2}$/),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string().length(2),
  isFeatured: z.boolean(),
})) satisfies z.ZodType<HomeProperty[]>;

export async function fetchHomeProperties(url: string): Promise<HomeProperty[]> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error("Resposta indisponível.");

    return homePropertiesSchema.parse(await response.json());
  } catch {
    throw new Error("Não foi possível carregar os imóveis.");
  }
}
