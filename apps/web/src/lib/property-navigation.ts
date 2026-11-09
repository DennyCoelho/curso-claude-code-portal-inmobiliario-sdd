export function buildPropertyDetailHref(id: string, catalogParameters = "") {
  const path = `/properties/${encodeURIComponent(id)}`;
  const from = new URLSearchParams(catalogParameters).toString();
  return from ? `${path}?${new URLSearchParams({ from })}` : path;
}

export function getPropertyCatalogHref(from: string | string[] | undefined) {
  // O retorno é sempre local ao catálogo, mesmo com parâmetros fornecidos na URL.
  const parameters = typeof from === "string" ? new URLSearchParams(from).toString() : "";
  return parameters ? `/properties?${parameters}` : "/properties";
}
