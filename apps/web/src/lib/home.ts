import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";

export type HomeProperty = Pick<
  PublicProperty,
  "id" | "title" | "operation" | "type" | "price" | "neighborhood" | "city" | "state" | "isFeatured"
>;

export function selectHomeProperties(properties: HomeProperty[]) {
  return {
    featured: properties.filter((property) => property.isFeatured).slice(0, 3),
    sale: properties.filter((property) => property.operation === "SALE").slice(0, 3),
    rent: properties.filter((property) => property.operation === "RENT").slice(0, 3),
  };
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatHomePrice(property: Pick<HomeProperty, "price" | "operation">) {
  const price = currencyFormatter.format(Number(property.price));
  return property.operation === "RENT" ? `${price}/mês` : price;
}

export const propertyTypeLabels: Record<HomeProperty["type"], string> = {
  HOUSE: "Casa",
  APARTMENT: "Apartamento",
  LAND: "Terreno",
  OFFICE: "Escritório",
  COMMERCIAL: "Imóvel comercial",
  OTHER: "Outro imóvel",
};
