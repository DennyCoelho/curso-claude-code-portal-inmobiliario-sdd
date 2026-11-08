import type { PublicPropertyFilters } from "@portal-inmobiliario/contracts/public-property";
import { z } from "zod";
import { normalizePriceInput } from "./property-price-range";

export const brazilianStates = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

function decimalSchema(integerDigits: number) {
  const pattern = new RegExp(`^\\d{1,${integerDigits}}([.,]\\d{1,2})?$`);
  return z.string().trim().refine((value) => !value || pattern.test(value), "Use um valor não negativo, sem milhar, com até duas casas decimais e dentro do limite permitido.");
}

const priceSchema = z.string().transform((value, context) => {
  const normalized = normalizePriceInput(value);
  if (normalized === null) {
    context.addIssue({ code: "custom", message: "Informe um preço em reais, com até duas casas decimais." });
    return z.NEVER;
  }
  return normalized;
}).refine((value) => !value || decimalInCents(value) <= 1_000_000_000n, "Escolha um preço entre R$ 0 e R$ 10.000.000.");

export const catalogFiltersSchema = z.object({
  operation: z.enum(["", "SALE", "RENT"], { error: "Selecione uma operação válida." }),
  type: z.array(z.enum(["HOUSE", "APARTMENT", "LAND", "OFFICE", "COMMERCIAL", "OTHER"], { error: "Selecione um tipo de imóvel válido." })).max(6, "Selecione até seis tipos de imóvel."),
  minPrice: priceSchema,
  maxPrice: priceSchema,
  bedrooms: z.enum(["", "1", "2", "3", "4+"], { error: "Selecione 1, 2, 3 ou 4 ou mais quartos." }),
  bathrooms: z.enum(["", "1", "2", "3", "4+"], { error: "Selecione 1, 2, 3 ou 4 ou mais banheiros." }),
  minUsableArea: decimalSchema(10),
  neighborhood: z.string().trim().max(200, "Use até 200 caracteres no bairro."),
  city: z.string().trim().max(200, "Use até 200 caracteres na cidade."),
  state: z.string().trim().toUpperCase().refine((value) => !value || brazilianStates.some((state) => state === value), "Selecione uma UF brasileira válida."),
}).superRefine((values, context) => {
  if (values.minPrice && values.maxPrice
    && /^\d{1,12}([.,]\d{1,2})?$/.test(values.minPrice)
    && /^\d{1,12}([.,]\d{1,2})?$/.test(values.maxPrice)
    && decimalInCents(values.minPrice) > decimalInCents(values.maxPrice)) {
    context.addIssue({ code: "custom", path: ["maxPrice"], message: "O preço máximo deve ser maior ou igual ao preço mínimo." });
  }
});

export type CatalogFilterValues = z.infer<typeof catalogFiltersSchema>;
export const catalogFilterNames = Object.keys(catalogFiltersSchema.shape) as (keyof CatalogFilterValues)[];

function normalizeDecimal(value: string) {
  const [integer, fraction = ""] = value.replace(",", ".").split(".");
  return `${BigInt(integer)}.${fraction.padEnd(2, "0")}`;
}

function decimalInCents(value: string) {
  return BigInt(normalizeDecimal(value).replace(".", ""));
}

export function getCatalogFilterValues(parameters: string): CatalogFilterValues {
  const query = new URLSearchParams(parameters);
  const values = Object.fromEntries(catalogFilterNames.map((name) => [name, name === "type"
    ? query.getAll(name).map((value) => value.trim()).filter(Boolean)
    : (query.get(name) ?? "").trim()])) as CatalogFilterValues;
  values.state = values.state.toUpperCase();
  return values;
}

export function toPublicPropertyFilters(values: CatalogFilterValues): PublicPropertyFilters {
  const filters: PublicPropertyFilters = {};
  if (values.operation) filters.operation = values.operation;
  if (values.type.length) filters.type = [...new Set(values.type)].sort();
  for (const name of ["bedrooms", "bathrooms"] as const) {
    if (values[name]) filters[name] = values[name] === "4+" ? "4+" : Number(values[name]) as 1 | 2 | 3;
  }
  for (const name of ["minPrice", "maxPrice", "minUsableArea"] as const) {
    if (values[name]) filters[name] = normalizeDecimal(values[name]);
  }
  for (const name of ["neighborhood", "city", "state"] as const) {
    if (values[name]) filters[name] = values[name];
  }
  return filters;
}

export function parseCatalogFilters(parameters: string) {
  const query = new URLSearchParams(parameters);
  for (const name of catalogFilterNames) {
    if (name !== "type" && query.getAll(name).length > 1) return { success: false as const, message: `Informe apenas um valor para ${name}.` };
    if (name === "type" && query.getAll(name).length > 6) return { success: false as const, message: "Selecione até seis tipos de imóvel." };
  }
  const result = catalogFiltersSchema.safeParse(getCatalogFilterValues(parameters));
  return result.success
    ? { success: true as const, filters: toPublicPropertyFilters(result.data) }
    : { success: false as const, message: result.error.issues[0].message };
}

export function buildCatalogFiltersUrl(values: CatalogFilterValues | null, currentParameters = "") {
  const query = new URLSearchParams(currentParameters);
  for (const name of catalogFilterNames) query.delete(name);
  if (values) {
    const filters = toPublicPropertyFilters(catalogFiltersSchema.parse(values));
    for (const [name, value] of Object.entries(filters)) {
      for (const item of Array.isArray(value) ? value : [value]) query.append(name, String(item));
    }
  }
  return query.size ? `/properties?${query}` : "/properties";
}
