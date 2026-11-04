export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    // Consultar novamente o servidor após mudanças de publicação.
    headers: { "Cache-Control": "no-store" },
  });
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ message, status }, status);
}

export function internalErrorResponse(error: unknown): Response {
  console.error("Falha na API pública de imóveis.", error);
  return errorResponse(500, "Não foi possível consultar os imóveis.");
}
