import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";
import type { PropertyCardData } from "./property";

export type HomeProperty = PropertyCardData & Pick<PublicProperty, "isFeatured">;

export function selectHomeProperties(properties: HomeProperty[]) {
  return {
    featured: properties.filter((property) => property.isFeatured).slice(0, 3),
    sale: properties.filter((property) => property.operation === "SALE").slice(0, 3),
    rent: properties.filter((property) => property.operation === "RENT").slice(0, 3),
  };
}
