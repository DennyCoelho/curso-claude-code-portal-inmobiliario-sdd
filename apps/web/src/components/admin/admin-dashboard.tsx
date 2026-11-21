import Link from "next/link";
import type { AdminDashboard as DashboardCounts } from "@portal-inmobiliario/contracts/admin-dashboard";

const numberFormat = new Intl.NumberFormat("pt-BR");
const indicators = [
  { key: "totalProperties", label: "Total de imóveis", description: "Publicados e rascunhos" },
  { key: "publishedProperties", label: "Imóveis publicados", description: "Disponíveis no portal público" },
  { key: "saleProperties", label: "Imóveis à venda", description: "Publicados e rascunhos de venda" },
  { key: "rentProperties", label: "Imóveis para aluguel", description: "Publicados e rascunhos de aluguel" },
  { key: "totalUsers", label: "Usuários", description: "Todas as contas, incluindo administradores e inativas" },
  { key: "totalInquiries", label: "Consultas", description: "Solicitações salvas de visitantes e usuários" },
] as const;

export function AdminDashboard({ dashboard }: { dashboard: DashboardCounts }) {
  return (
    <div className="max-w-5xl space-y-8">
      <header className="space-y-5">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Administração</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Painel administrativo</h1>
          <p className="max-w-2xl leading-7 text-slate-700">Acompanhe os imóveis, as contas e as solicitações do portal.</p>
        </div>
        <nav aria-label="Ações da administração" className="flex flex-wrap gap-3">
          <Link href="/account" prefetch={false} className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Minha conta</Link>
          <Link href="/properties" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-white">Explorar imóveis</Link>
          <Link href="/login" prefetch={false} className="inline-flex min-h-11 items-center px-3 font-semibold text-emerald-800 underline underline-offset-4">Gerenciar sessão</Link>
        </nav>
      </header>
      <section aria-labelledby="admin-indicators-title" className="space-y-5">
        <div className="space-y-2">
          <h2 id="admin-indicators-title" className="text-xl font-semibold tracking-tight">Visão geral</h2>
          <p className="text-sm leading-6 text-slate-600">Os indicadores consideram todos os cadastros do portal e são atualizados a cada acesso ou recarregamento desta página.</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {indicators.map(({ key, label, description }) => (
            <div key={key} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6">
              <dt className="font-medium text-slate-700">{label}</dt>
              <dd className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-emerald-900 [overflow-wrap:anywhere]">{numberFormat.format(dashboard[key])}</dd>
              <dd className="mt-3 text-sm leading-6 text-slate-600">{description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
