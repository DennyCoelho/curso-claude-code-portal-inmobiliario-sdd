import "server-only";

import type { PublicPropertyFilters } from "@portal-inmobiliario/contracts/public-property";
import type { Prisma } from "../generated/prisma/client";
import { getDatabase } from "../lib/db";

// Selecionar somente dados públicos, sem favoritos, consultas ou IDs do Cloudinary.
const publicPropertySelect = {
  id: true,
  title: true,
  description: true,
  operation: true,
  type: true,
  price: true,
  usableArea: true,
  totalArea: true,
  bedrooms: true,
  bathrooms: true,
  parkingSpaces: true,
  age: true,
  address: true,
  addressNumber: true,
  addressComplement: true,
  neighborhood: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  images: {
    select: { id: true, url: true, position: true, isMain: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  },
  features: {
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.PropertySelect;

export type PublicPropertyRecord = Prisma.PropertyGetPayload<{
  select: typeof publicPropertySelect;
}>;

export interface PublicPropertyRepository {
  findPublished(search?: string, filters?: PublicPropertyFilters): Promise<PublicPropertyRecord[]>;
  findPublishedById(id: string): Promise<PublicPropertyRecord | null>;
  findPublishedPriceRange(operation?: PublicPropertyFilters["operation"]): Promise<{ minPrice: PublicPropertyRecord["price"] | null; maxPrice: PublicPropertyRecord["price"] | null }>;
}

export function createPublicPropertyRepository(
  database?: Pick<Prisma.TransactionClient, "property">,
): PublicPropertyRepository {
  return {
    async findPublished(search = "", filters = {}) {
      // Escapar os curingas do LIKE para pesquisar o texto literalmente.
      const contains = search.replace(/[\\%_]/g, "\\$&");
      return (database ?? getDatabase()).property.findMany({
        where: {
          isPublished: true,
          operation: filters.operation,
          type: filters.type?.length ? { in: filters.type } : undefined,
          price: { gte: filters.minPrice, lte: filters.maxPrice },
          bedrooms: filters.bedrooms === "4+" ? { gte: 4 } : filters.bedrooms,
          bathrooms: filters.bathrooms === "4+" ? { gte: 4 } : filters.bathrooms,
          usableArea: filters.minUsableArea === undefined ? undefined : { gte: filters.minUsableArea },
          state: filters.state,
          ...(filters.neighborhood ? { neighborhood: { contains: filters.neighborhood.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } } : {}),
          ...(filters.city ? { city: { contains: filters.city.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } } : {}),
          ...(search ? {
            OR: ["title", "neighborhood", "city", "state", "description"].map((field) => ({
              [field]: { contains, mode: "insensitive" },
            })),
          } : {}),
        },
        select: publicPropertySelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      });
    },
    async findPublishedPriceRange(operation) {
      const result = await (database ?? getDatabase()).property.aggregate({
        where: { isPublished: true, operation },
        _min: { price: true },
        _max: { price: true },
      });
      return { minPrice: result._min.price, maxPrice: result._max.price };
    },
    async findPublishedById(id) {
      return (database ?? getDatabase()).property.findFirst({
        where: { id, isPublished: true },
        select: publicPropertySelect,
      });
    },
  };
}
