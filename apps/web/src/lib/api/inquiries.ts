import { inquiryPageSchema } from "@portal-inmobiliario/contracts/inquiries";

export class InquiryRequestError extends Error {
  constructor(public status: number) { super("Não foi possível carregar suas consultas. Tente novamente."); }
}

export async function fetchInquiries(page: number) {
  let response: Response;
  try {
    response = await fetch(`/api/inquiries?page=${page}`, { cache: "no-store", credentials: "same-origin",
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  } catch { throw new InquiryRequestError(0); }
  if (!response.ok) throw new InquiryRequestError(response.status);
  try { return inquiryPageSchema.parse(await response.json()); }
  catch { throw new InquiryRequestError(0); }
}
