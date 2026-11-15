import "server-only";

import { normalizeBrazilianPhone, web3FormsPayloadSchema, type PreparedPropertyContact, type PropertyContact } from "@portal-inmobiliario/contracts/property-contact";
import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";
import { publicPropertyService } from "./public-property-service";

export class ContactError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function createPropertyContactService(
  properties: { findById(id: string): Promise<Pick<PublicProperty, "id" | "title"> | null> } = publicPropertyService,
) {
  return {
    async prepare(contact: PropertyContact): Promise<PreparedPropertyContact> {
      const accessKey = process.env.WEB3FORMS_ACCESS_KEY?.trim();
      if (!web3FormsPayloadSchema.shape.access_key.safeParse(accessKey).success) throw new ContactError(503, "O contato está temporariamente indisponível. Tente novamente mais tarde.");
      const property = await properties.findById(contact.propertyId);
      if (!property) throw new ContactError(404, "Este imóvel não está disponível para contato.");
      const phone = normalizeBrazilianPhone(contact.phone);
      if (!phone) throw new ContactError(400, "Informe um telefone brasileiro válido com DDD.");
      return { provider: "web3forms", payload: web3FormsPayloadSchema.parse({
        access_key: accessKey,
        name: contact.name,
        email: contact.email,
        phone,
        message: contact.message,
        property_id: property.id,
        property_title: property.title,
        subject: `Contato sobre imóvel: ${property.title.replace(/[\r\n]/g, " ").slice(0, 150)}`,
        from_name: "Portal Imobiliário",
        botcheck: false,
      }) };
    },
  };
}

export const propertyContactService = createPropertyContactService();
