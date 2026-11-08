export const maximumSliderPrice = 10_000_000;
export const maximumPriceSliderIndex = 11_900;

const priceInputFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function normalizePriceInput(value: string): string | null {
  const text = value.trim().replace(/^R\$\s*/, "");
  if (!text) return "";
  const decimal = /^\d{1,3}(\.\d{3})+(,\d{0,2})?$/.test(text)
    ? text.replaceAll(".", "").replace(",", ".") : text.replace(",", ".");
  if (!/^\d{1,12}(\.\d{0,2})?$/.test(decimal)) return null;
  const [integer, fraction = ""] = decimal.split(".");
  return `${BigInt(integer)}.${fraction.padEnd(2, "0")}`;
}

export function formatPriceInput(value: string) {
  const normalized = normalizePriceInput(value);
  return normalized ? priceInputFormatter.format(priceInCents(normalized) / 100) : value;
}

const priceBands = [
  { start: 0, end: 10_000, step: 50, startIndex: 0, endIndex: 200 },
  { start: 10_000, end: 100_000, step: 100, startIndex: 200, endIndex: 1_100 },
  { start: 100_000, end: 1_000_000, step: 500, startIndex: 1_100, endIndex: 2_900 },
  { start: 1_000_000, end: maximumSliderPrice, step: 1_000, startIndex: 2_900, endIndex: maximumPriceSliderIndex },
] as const;

export function sliderIndexToPrice(index: number) {
  const position = Math.max(0, Math.min(maximumPriceSliderIndex, Math.round(index)));
  const band = priceBands.find((band) => position <= band.endIndex)!;
  return band.start + (position - band.startIndex) * band.step;
}

export function priceToSliderIndex(price: number, rounding: "nearest" | "floor" | "ceil" = "nearest") {
  const value = Math.max(0, Math.min(maximumSliderPrice, price));
  const band = priceBands.find((band) => value <= band.end)!;
  const round = rounding === "floor" ? Math.floor : rounding === "ceil" ? Math.ceil : Math.round;
  return band.startIndex + round((value - band.start) / band.step);
}

export function adjacentPriceSliderIndex(price: number, direction: -1 | 1) {
  const index = priceToSliderIndex(price, direction === 1 ? "floor" : "ceil") + direction;
  return Math.max(0, Math.min(maximumPriceSliderIndex, index));
}

export function priceInCents(value: string) {
  const [integer, fraction = ""] = value.replace(",", ".").split(".");
  return Number(BigInt(integer) * 100n + BigInt(fraction.padEnd(2, "0")));
}

export function centsAsPrice(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function getPriceSliderValues(minValue: string, maxValue: string) {
  const normalizedMinimum = normalizePriceInput(minValue);
  const normalizedMaximum = normalizePriceInput(maxValue);
  const minimum = normalizedMinimum ? priceInCents(normalizedMinimum) / 100 : 0;
  const maximum = normalizedMaximum ? priceInCents(normalizedMaximum) / 100 : maximumSliderPrice;
  return { minimum: Math.min(minimum, maximumSliderPrice), maximum: Math.min(maximum, maximumSliderPrice) };
}
