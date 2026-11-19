import { z } from "zod";
import { propertyContactSchema, preparedPropertyContactSchema } from "./property-contact";

export const INQUIRIES_PAGE_SIZE = 10;
export const inquiryRequestSchema = propertyContactSchema.extend({
  requestId: z.uuid().transform((value) => value.toLowerCase()),
}).strict();
export const savedInquirySchema = z.object({ id: z.uuid(), createdAt: z.iso.datetime() }).strict();
export const preparedInquirySchema = preparedPropertyContactSchema.extend({ inquiry: savedInquirySchema }).strict();
export const inquiryPageNumberSchema = z.coerce.number().int().min(1).max(1_000_000);
export const inquiryPageSchema = z.object({
  items: z.array(savedInquirySchema.extend({
    message: z.string(),
    property: z.object({ id: z.uuid(), title: z.string().min(1) }).strict().nullable(),
  }).strict()).max(INQUIRIES_PAGE_SIZE),
  total: z.number().int().nonnegative(), page: z.number().int().positive(),
  pageSize: z.literal(INQUIRIES_PAGE_SIZE), totalPages: z.number().int().nonnegative(),
}).strict().refine((value) => value.totalPages === Math.ceil(value.total / INQUIRIES_PAGE_SIZE)
  && value.page <= Math.max(1, value.totalPages)
  && value.items.length === Math.min(INQUIRIES_PAGE_SIZE, Math.max(0, value.total - (value.page - 1) * INQUIRIES_PAGE_SIZE)),
"Paginação incompatível.");

export type InquiryRequest = z.infer<typeof inquiryRequestSchema>;
export type PreparedInquiry = z.infer<typeof preparedInquirySchema>;
export type InquiryPage = z.infer<typeof inquiryPageSchema>;
