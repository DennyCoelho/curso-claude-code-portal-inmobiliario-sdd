import { type ContactResponse, type PropertyContact } from "@portal-inmobiliario/contracts/property-contact";
import { preparedInquirySchema } from "@portal-inmobiliario/contracts/inquiries";

export async function submitPropertyContact(contact: PropertyContact, requestId = crypto.randomUUID()): Promise<ContactResponse> {
  let response: Response;
  let result: unknown;
  try {
    response = await fetch("/api/inquiries", {
      method: "POST",
      credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...contact, requestId }),
      signal: AbortSignal.timeout(15_000),
    });
    result = await response.json();
  } catch {
    throw new Error("Não foi possível confirmar o registro. Tente novamente com os mesmos dados para evitar duplicação.");
  }
  if (!response.ok) {
    if (response.status === 503) throw new Error("O contato está temporariamente indisponível. Tente novamente mais tarde.");
    if (response.status === 404) throw new Error("Este imóvel não está disponível para contato.");
    if (response.status === 401) throw new Error("Sua sessão terminou. Entre novamente antes de enviar a solicitação.");
    if (response.status === 429) throw new Error("Muitas solicitações. Aguarde quinze minutos antes de tentar novamente.");
    if (response.status === 409) throw new Error("Esta tentativa já foi utilizada com outros dados ou outra conta. Recarregue a página para iniciar uma nova solicitação.");
    throw new Error("Não foi possível confirmar o registro. Tente novamente com os mesmos dados para evitar duplicação.");
  }
  const preparation = preparedInquirySchema.safeParse(result);
  if (!preparation.success || preparation.data.payload.property_id !== contact.propertyId.toLowerCase() || preparation.data.inquiry.id !== requestId.toLowerCase()) {
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
    throw new Error("Sua consulta foi salva no portal, mas o envio por e-mail não foi confirmado. Aguarde antes de tentar novamente; o e-mail pode ter sido enviado.");
  }
  return { success: true, message: "Solicitação enviada com sucesso." };
}
