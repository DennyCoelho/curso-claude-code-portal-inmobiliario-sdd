import { preparedPropertyContactSchema, type ContactResponse, type PropertyContact } from "@portal-inmobiliario/contracts/property-contact";

export async function submitPropertyContact(contact: PropertyContact): Promise<ContactResponse> {
  let response: Response;
  let result: unknown;
  try {
    response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(contact),
      signal: AbortSignal.timeout(15_000),
    });
    result = await response.json();
  } catch {
    throw new Error("Não foi possível confirmar o envio. Aguarde antes de tentar novamente.");
  }
  if (!response.ok) {
    if (response.status === 503) throw new Error("O contato está temporariamente indisponível. Tente novamente mais tarde.");
    if (response.status === 404) throw new Error("Este imóvel não está disponível para contato.");
    throw new Error("Não foi possível confirmar o envio. Aguarde antes de tentar novamente.");
  }
  const preparation = preparedPropertyContactSchema.safeParse(result);
  if (!preparation.success || preparation.data.payload.property_id !== contact.propertyId.toLowerCase()) {
    throw new Error("Não foi possível preparar a solicitação. Tente novamente mais tarde.");
  }
  try {
    const providerResponse = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(preparation.data.payload),
      signal: AbortSignal.timeout(15_000),
    });
    const providerResult: unknown = await providerResponse.json();
    if (!providerResponse.ok || typeof providerResult !== "object" || providerResult === null || !("success" in providerResult) || providerResult.success !== true) {
      throw new Error("Envio não confirmado.");
    }
  } catch {
    throw new Error("Não foi possível confirmar o envio. Aguarde antes de tentar novamente.");
  }
  return { success: true, message: "Solicitação enviada com sucesso." };
}
