import type { PropertyListItem } from "./property";

export type HomeProperty = PropertyListItem;

export function selectHomeProperties(properties: HomeProperty[]) {
  return {
    featured: properties.filter((property) => property.isFeatured).slice(0, 3),
    sale: properties.filter((property) => property.operation === "SALE").slice(0, 3),
    rent: properties.filter((property) => property.operation === "RENT").slice(0, 3),
  };
}
