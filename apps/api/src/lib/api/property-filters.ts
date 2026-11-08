import type { PublicPropertyFilters } from "@portal-inmobiliario/contracts/public-property";

const filterNames = ["operation", "type", "minPrice", "maxPrice", "bedrooms", "bathrooms", "minUsableArea", "neighborhood", "city", "state"] as const;
const states = new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));

type PropertyFiltersResult =
  | { success: true; filters: PublicPropertyFilters }
  | { success: false; message: string };

export function parsePropertyFilters(parameters: URLSearchParams): PropertyFiltersResult {
  const filters: PublicPropertyFilters = {};
  for (const name of filterNames) {
    const values = parameters.getAll(name);
    if (name !== "type" && values.length > 1) return { success: false, message: `Informe apenas um valor para ${name}.` };
    if (name === "type") {
      const types = [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
      if (values.length > 6 || types.some((value) => !["HOUSE", "APARTMENT", "LAND", "OFFICE", "COMMERCIAL", "OTHER"].includes(value))) {
        return { success: false, message: "Selecione até seis tipos de imóvel válidos." };
      }
      if (types.length) filters.type = types as NonNullable<PublicPropertyFilters["type"]>;
      continue;
    }
    const value = (values[0] ?? "").trim();
    if (!value) continue;

    switch (name) {
      case "operation":
        if (value !== "SALE" && value !== "RENT") return { success: false, message: "Selecione uma operação válida." };
        filters.operation = value;
        break;
      case "minPrice":
      case "maxPrice":
      case "minUsableArea": {
        const pattern = name === "minUsableArea" ? /^\d{1,10}(\.\d{1,2})?$/ : /^\d{1,12}(\.\d{1,2})?$/;
        if (!pattern.test(value)) return { success: false, message: "Informe preços e área não negativos, com ponto decimal e até duas casas, dentro dos limites permitidos." };
        const [integer, fraction = ""] = value.split(".");
        filters[name] = `${BigInt(integer)}.${fraction.padEnd(2, "0")}`;
        break;
      }
      case "bedrooms":
      case "bathrooms":
        if (!["1", "2", "3", "4+"].includes(value)) return { success: false, message: `Selecione 1, 2, 3 ou 4 ou mais ${name === "bedrooms" ? "quartos" : "banheiros"}.` };
        filters[name] = value === "4+" ? "4+" : Number(value) as 1 | 2 | 3;
        break;
      case "state":
        if (!states.has(value.toUpperCase())) return { success: false, message: "Selecione uma UF brasileira válida." };
        filters.state = value.toUpperCase();
        break;
      case "neighborhood":
      case "city":
        if (value.length > 200) return { success: false, message: "Use até 200 caracteres no bairro e na cidade." };
        filters[name] = value;
        break;
    }
  }
  if (filters.minPrice && filters.maxPrice && BigInt(filters.minPrice.replace(".", "")) > BigInt(filters.maxPrice.replace(".", ""))) {
    return { success: false, message: "O preço máximo deve ser maior ou igual ao preço mínimo." };
  }
  return { success: true, filters };
}
