import "server-only";
import { INQUIRIES_PAGE_SIZE, inquiryRequestSchema, type InquiryRequest, type InquiryPage, type PreparedInquiry } from "@portal-inmobiliario/contracts/inquiries";
import { normalizeBrazilianPhone } from "@portal-inmobiliario/contracts/property-contact";
import { createInquiryRepository, type InquiryRepository } from "@/repositories/inquiry-repository";
import { createPropertyContactService, getContactAccessKey } from "./property-contact-service";

export function createInquiryService(repository: InquiryRepository = createInquiryRepository()) {
  return {
    async create(input: InquiryRequest, userId: string | null): Promise<PreparedInquiry> {
      const contact = inquiryRequestSchema.parse(input);
      getContactAccessKey();
      const normalized = { ...contact, email: contact.email.toLowerCase(), phone: normalizeBrazilianPhone(contact.phone)! };
      const saved = await repository.save(normalized, userId);
      const prepared = await createPropertyContactService({ async findById() { return saved.property; } }).prepare(normalized);
      return { ...prepared, inquiry: { id: saved.id, createdAt: saved.createdAt.toISOString() } };
    },
    async list(userId: string, page = 1): Promise<InquiryPage> {
      const result = await repository.list(userId, page);
      return { ...result, pageSize: INQUIRIES_PAGE_SIZE, items: result.items.map(({ property, createdAt, ...item }) => ({ ...item,
        createdAt: createdAt.toISOString(), property: property.isPublished ? { id: property.id, title: property.title } : null,
      })) };
    },
  };
}
export const inquiryService = createInquiryService();
