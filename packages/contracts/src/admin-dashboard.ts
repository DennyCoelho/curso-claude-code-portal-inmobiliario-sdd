import { z } from "zod";

const countSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const adminDashboardSchema = z.object({
  totalProperties: countSchema,
  publishedProperties: countSchema,
  saleProperties: countSchema,
  rentProperties: countSchema,
  totalUsers: countSchema,
  totalInquiries: countSchema,
}).strict().refine((counts) => counts.publishedProperties <= counts.totalProperties
  && counts.saleProperties + counts.rentProperties === counts.totalProperties, {
  message: "Os indicadores de imóveis devem ser consistentes.",
});

export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
