import { z } from "zod";
import type { PropertyListItem } from "../property";
import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";

// Validar os campos públicos usados pela landing e pelo catálogo.
const propertyListItemSchema = z.object({
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
}) satisfies z.ZodType<PropertyListItem>;

const propertiesSchema = z.array(propertyListItemSchema);
const publicPropertySchema = propertyListItemSchema.extend({
  description: z.string(),
  parkingSpaces: z.number().int().nonnegative().nullable(),
  age: z.number().int().nonnegative().nullable(),
  address: z.string(),
  addressNumber: z.string(),
  addressComplement: z.string().nullable(),
  postalCode: z.string().regex(/^\d{8}$/),
  country: z.literal("BR"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  features: z.array(z.object({ id: z.uuid(), name: z.string().min(1) })),
}) satisfies z.ZodType<PublicProperty>;

export async function fetchPublicProperty(id: string, apiUrl: string): Promise<PublicProperty | null> {
  if (!z.uuid().safeParse(id).success) return null;
  try {
    const normalizedId = id.toLowerCase();
    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/properties/${normalizedId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Resposta indisponível.");
    const property = publicPropertySchema.parse(await response.json());
    if (property.id.toLowerCase() !== normalizedId) throw new Error("Imóvel incompatível.");
    return property;
  } catch {
    throw new Error("Não foi possível carregar o imóvel.");
  }
}

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
