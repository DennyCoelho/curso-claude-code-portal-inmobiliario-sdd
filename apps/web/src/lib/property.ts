import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";

export type PropertyCardData = Pick<
  PublicProperty,
  "id" | "title" | "operation" | "type" | "price" | "neighborhood" | "city" | "state"
  | "images" | "bedrooms" | "bathrooms" | "usableArea" | "totalArea"
>;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const areaFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatPropertyPrice(property: Pick<PropertyCardData, "price" | "operation">) {
  const price = currencyFormatter.format(Number(property.price));
  return property.operation === "RENT" ? `${price}/mês` : price;
}

export function formatPropertyArea(area: string) {
  return `${areaFormatter.format(Number(area))} m²`;
}

export function selectPropertyImage(images: PropertyCardData["images"]) {
  return images.toSorted((first, second) =>
    Number(second.isMain) - Number(first.isMain) || first.position - second.position,
  )[0];
}

export function isCloudinaryImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com"
      && url.port === "" && url.username === "" && url.password === "" && url.search === ""
      && /^\/[^/]+\/image\/upload\/.+/.test(url.pathname);
  } catch {
    return false;
  }
}

export const propertyTypeLabels: Record<PropertyCardData["type"], string> = {
  HOUSE: "Casa",
  APARTMENT: "Apartamento",
  LAND: "Terreno",
  OFFICE: "Escritório",
  COMMERCIAL: "Imóvel comercial",
  OTHER: "Outro imóvel",
};
