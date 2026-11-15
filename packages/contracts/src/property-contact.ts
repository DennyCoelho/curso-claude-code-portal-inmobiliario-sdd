import { z } from "zod";

const brazilianAreaCodes = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38", "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55", "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79", "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

export function normalizeBrazilianPhone(value: string): string | null {
  const phone = value.trim();
  if (!/^(?:\+55\s*)?[\d\s().-]+$/.test(phone)) return null;
  let digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) digits = digits.slice(2);
  else if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  if (!brazilianAreaCodes.has(digits.slice(0, 2))) return null;
  if (!/^\d{2}(?:[2-5]\d{7}|9\d{8})$/.test(digits)) return null;
  return `+55${digits}`;
}

export const contactFieldsSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome com pelo menos 2 caracteres.").max(100, "Use até 100 caracteres no nome.")
    .refine((value) => !/[\r\n\x00-\x1f\x7f]/.test(value), "Informe um nome válido."),
  email: z.string().trim().max(254, "Use até 254 caracteres no e-mail.").email("Informe um e-mail válido."),
  phone: z.string().trim().max(30, "Informe um telefone brasileiro com DDD.")
    .refine((value) => normalizeBrazilianPhone(value)?.length === 14, "Informe um celular válido com DDD e 11 dígitos, por exemplo, (11) 91234-5678."),
  message: z.string().trim().min(10, "Escreva uma mensagem com pelo menos 10 caracteres.").max(3000, "Use até 3000 caracteres na mensagem."),
  botcheck: z.string().max(0, "Não foi possível enviar a solicitação.").optional(),
});

export const propertyContactSchema = contactFieldsSchema.extend({
  propertyId: z.uuid("Identificador de imóvel inválido.").transform((value) => value.toLowerCase()),
}).strict();

export type ContactFields = z.infer<typeof contactFieldsSchema>;
export type PropertyContact = z.infer<typeof propertyContactSchema>;
export type ContactResponse = { success: true; message: string };

export const web3FormsPayloadSchema = z.object({
  access_key: z.uuid(),
  name: contactFieldsSchema.shape.name,
  email: contactFieldsSchema.shape.email,
  phone: z.string().refine((value) => normalizeBrazilianPhone(value) === value && value.length === 14),
  message: contactFieldsSchema.shape.message,
  property_id: z.uuid(),
  property_title: z.string().min(1),
  subject: z.string().min(1).max(200),
  from_name: z.literal("Portal Imobiliário"),
  botcheck: z.literal(false),
}).strict();

export const preparedPropertyContactSchema = z.object({
  provider: z.literal("web3forms"),
  payload: web3FormsPayloadSchema,
}).strict();

export type PreparedPropertyContact = z.infer<typeof preparedPropertyContactSchema>;
