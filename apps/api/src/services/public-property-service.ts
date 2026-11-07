import "server-only";

import {
  createPublicPropertyRepository,
  type PublicPropertyRecord,
  type PublicPropertyRepository,
} from "../repositories/public-property-repository";
import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";

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
    async list(search = ""): Promise<PublicProperty[]> {
      const properties = await repository.findPublished(search);
      return properties.map(serializePublicProperty);
    },
    async findById(id: string): Promise<PublicProperty | null> {
      const property = await repository.findPublishedById(id);
      return property ? serializePublicProperty(property) : null;
    },
  };
}

export const publicPropertyService = createPublicPropertyService();
