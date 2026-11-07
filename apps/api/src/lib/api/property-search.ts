type PropertySearchResult =
  | { success: true; search: string }
  | { success: false; message: string };

export function parsePropertySearch(parameters: URLSearchParams): PropertySearchResult {
  const values = parameters.getAll("search");

  if (values.length > 1) {
    return { success: false, message: "Informe apenas um termo de busca." };
  }

  const search = (values[0] ?? "").trim();
  if (search.length > 200) {
    return { success: false, message: "Use até 200 caracteres na busca." };
  }

  return { success: true, search };
}
