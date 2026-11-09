import "server-only";

import {
  createPublicPropertyRepository,
  type PublicPropertyRecord,
  type PublicPropertyRepository,
} from "../repositories/public-property-repository";
import type { PublicProperty, PublicPropertyFilters, PublicPropertyPriceRange, PublicPropertySort } from "@portal-inmobiliario/contracts/public-property";

function serializePublicProperty(property: PublicPropertyRecord): PublicProperty {
  return {
    ...property,
    price: property.price.toFixed(2),
    usableArea: property.usableArea?.toFixed(2) ?? null,
    totalArea: property.totalArea?.toFixed(2) ?? null,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
  };
}

export function createPublicPropertyService(
  repository: PublicPropertyRepository = createPublicPropertyRepository(),
) {
  return {
    async priceRange(operation?: PublicPropertyFilters["operation"]): Promise<PublicPropertyPriceRange> {
      const range = await repository.findPublishedPriceRange(operation);
      return { minPrice: range.minPrice?.toFixed(2) ?? null, maxPrice: range.maxPrice?.toFixed(2) ?? null };
    },
    async list(search = "", filters: PublicPropertyFilters = {}, sort: PublicPropertySort = "recent"): Promise<PublicProperty[]> {
      const properties = await repository.findPublished(search, filters, sort);
      return properties.map(serializePublicProperty);
    },
    async findById(id: string): Promise<PublicProperty | null> {
      const property = await repository.findPublishedById(id);
      return property ? serializePublicProperty(property) : null;
    },
  };
}

export const publicPropertyService = createPublicPropertyService();
