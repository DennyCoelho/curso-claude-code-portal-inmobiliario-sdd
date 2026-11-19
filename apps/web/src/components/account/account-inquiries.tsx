"use client";

import Link from "next/link";
import useSWR from "swr";
import { inquiryPageNumberSchema } from "@portal-inmobiliario/contracts/inquiries";
import { useAuth } from "@/hooks/use-auth";
import { fetchInquiries, InquiryRequestError } from "@/lib/api/inquiries";
import { LoadingStatus } from "@/components/ui/loading-feedback";
import { RetryButton } from "@/components/ui/retry-button";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const linkClassName = "inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4";

export function AccountInquiries({ parameters = "" }: { parameters?: string }) {
  const auth = useAuth();
  const userId = !auth.error ? auth.data?.id : null;
  return <section id="account-inquiries" aria-labelledby="account-inquiries-title" className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
    <h2 id="account-inquiries-title" className="text-xl font-semibold tracking-tight">Consultas enviadas</h2>
    <p className="leading-7 text-slate-600">Consulte seus pedidos de informação registrados no portal. O registro é preservado mesmo quando o envio por e-mail não é confirmado.</p>
    {auth.isLoading ? <LoadingStatus>Carregando suas consultas…</LoadingStatus>
      : auth.error ? <div className="space-y-3"><p role="alert">Não foi possível verificar sua sessão.</p><RetryButton onRetry={() => auth.mutate()} /></div>
      : !userId ? <Link href="/login?next=%2Faccount" prefetch={false} className={linkClassName}>Entre na sua conta para ver suas consultas</Link>
      : <InquiryResults key={`${userId}:${parameters}`} userId={userId} parameters={parameters} invalidateSession={() => auth.mutate((current) => current?.id === userId ? null : current, { revalidate: false })} />}
  </section>;
}

function InquiryResults({ userId, parameters, invalidateSession }: { userId: string; parameters: string; invalidateSession: () => Promise<unknown> }) {
  const query = new URLSearchParams(parameters);
  const pages = query.getAll("inquiriesPage");
  const parsed = inquiryPageNumberSchema.safeParse(pages.length ? pages[0] : 1);
  const valid = parsed.success && pages.length <= 1;
  const page = parsed.success ? parsed.data : 1;
  const inquiries = useSWR(valid ? ["/api/inquiries", userId, page] : null, () => fetchInquiries(page), {
    shouldRetryOnError: false,
    onError(error: Error) { if (error instanceof InquiryRequestError && error.status === 401) void invalidateSession(); },
  });
  function pageUrl(value: number) {
    const next = new URLSearchParams(parameters);
    next.delete("inquiriesPage");
    if (value > 1) next.set("inquiriesPage", String(value));
    return `/account${next.size ? `?${next}` : ""}#account-inquiries`;
  }
  if (!valid) return <div><p role="alert">Página de consultas inválida.</p><Link href={pageUrl(1)} scroll={false} className={linkClassName}>Ver a primeira página</Link></div>;
  if (inquiries.isLoading) return <LoadingStatus>Carregando suas consultas…</LoadingStatus>;
  if (inquiries.error) return <div className="space-y-3"><p role="alert">Não foi possível carregar suas consultas.</p><RetryButton onRetry={() => inquiries.mutate()} className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold" /></div>;
  const result = inquiries.data;
  if (!result?.items.length) return <p role="status" className="leading-7 text-slate-600">Você ainda não registrou consultas nesta conta. Abra um imóvel e use o formulário Tenho interesse.</p>;
  return <div className="space-y-5">
    <p role="status" className="text-sm text-slate-600">{(result.page - 1) * result.pageSize + 1}–{(result.page - 1) * result.pageSize + result.items.length} de {result.total} {result.total === 1 ? "consulta registrada" : "consultas registradas"}</p>
    {inquiries.isValidating ? <LoadingStatus>Atualizando suas consultas…</LoadingStatus> : null}
    <ul className="space-y-4">
      {result.items.map((item) => <li key={item.id} className="min-w-0 space-y-2 rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold wrap-anywhere">{item.property ? <Link href={`/properties/${item.property.id}`} className={linkClassName}>{item.property.title}</Link> : "Imóvel indisponível"}</h3>
        <p className="text-sm text-slate-600">Registrada em <time dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))}</time></p>
        <p className="whitespace-pre-wrap leading-7 text-slate-700 wrap-anywhere">{item.message}</p>
      </li>)}
    </ul>
    {result.totalPages > 1 ? <nav aria-label="Páginas de consultas" className="flex flex-wrap items-center justify-between gap-3">
      {result.page > 1 ? <Link href={pageUrl(result.page - 1)} scroll={false} className={linkClassName}>Consultas anteriores</Link> : <span />}
      <span className="text-sm text-slate-600">Página {result.page} de {result.totalPages}</span>
      {result.page < result.totalPages ? <Link href={pageUrl(result.page + 1)} scroll={false} className={linkClassName}>Próximas consultas</Link> : null}
    </nav> : null}
  </div>;
}
