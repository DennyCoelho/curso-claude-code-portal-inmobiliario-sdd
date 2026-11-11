import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";

export type PropertyMapLocation = Pick<PublicProperty,
  "address" | "addressNumber" | "neighborhood" | "city" | "state" | "postalCode"
>;

export function formatPropertyMapAddress(property: PropertyMapLocation) {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ");
  return [
    normalize(property.address),
    normalize(property.addressNumber),
    normalize(property.neighborhood),
    `${normalize(property.city)} - ${normalize(property.state)}`,
    `${property.postalCode.slice(0, 5)}-${property.postalCode.slice(5)}`,
    "Brasil",
  ].join(", ");
}

export function buildPropertyMapLinks(property: PropertyMapLocation, zoomValue?: string) {
  const address = formatPropertyMapAddress(property);
  const zoom = zoomValue?.trim();
  const validZoom = zoom && /^(?:[0-9]|1[0-9]|2[01])$/.test(zoom) ? zoom : "15";
  const embed = new URL("https://maps.google.com/maps");
  embed.search = new URLSearchParams({ q: address, output: "embed", hl: "pt-BR", gl: "br", z: validZoom }).toString();
  const external = new URL("https://www.google.com/maps/search/");
  external.search = new URLSearchParams({ api: "1", query: address }).toString();
  return { embedHref: embed.href, externalHref: external.href };
}
