import Link from "next/link";
import type { AuthenticatedUser } from "@portal-inmobiliario/contracts/auth";
import type { ReactNode } from "react";

const roleLabels = { USER: "Usuário", ADMIN: "Administrador" };

export function AccountOverview({ user, children }: { user: AuthenticatedUser; children?: ReactNode }) {
  return (
    <div className="max-w-5xl space-y-8">
      <header className="space-y-5">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Minha conta</h1>
          <p className="max-w-2xl leading-7 text-slate-700">
            Confira seus dados e gerencie o acesso à sua conta.
          </p>
        </div>
        <nav aria-label="Ações da conta" className="flex flex-wrap gap-3">
          <Link href="/properties" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">
            Explorar imóveis
          </Link>
          <Link href="/login" prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-white">
            Gerenciar sessão
          </Link>
          {user.role === "ADMIN" ? (
            <Link href="/admin" prefetch={false} className="inline-flex min-h-11 items-center px-3 font-semibold text-emerald-800 underline underline-offset-4">
              Administração
            </Link>
          ) : null}
        </nav>
      </header>

      <section aria-labelledby="account-information-title" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 id="account-information-title" className="text-xl font-semibold tracking-tight">Informações da conta</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0 space-y-2">
            <dt className="text-sm font-medium text-slate-600">Nome</dt>
            <dd className="font-semibold [overflow-wrap:anywhere]">{user.name}</dd>
          </div>
          <div className="min-w-0 space-y-2">
            <dt className="text-sm font-medium text-slate-600">E-mail</dt>
            <dd className="[overflow-wrap:anywhere]">{user.email}</dd>
          </div>
          <div className="min-w-0 space-y-2">
            <dt className="text-sm font-medium text-slate-600">Perfil de acesso</dt>
            <dd className="font-semibold">{roleLabels[user.role]}</dd>
          </div>
        </dl>
      </section>

      {children}

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="account-favorites-title" className="space-y-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">Em breve</span>
          <h2 id="account-favorites-title" className="text-xl font-semibold tracking-tight">Imóveis de interesse</h2>
          <p className="leading-7 text-slate-600">
            Em breve, você poderá reunir seus imóveis favoritos aqui e retomar sua busca com facilidade.
          </p>
        </section>
        <section aria-labelledby="account-inquiries-title" className="space-y-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">Em breve</span>
          <h2 id="account-inquiries-title" className="text-xl font-semibold tracking-tight">Consultas enviadas</h2>
          <p className="leading-7 text-slate-600">
            Em breve, você poderá consultar nesta seção os imóveis sobre os quais pediu informações.
          </p>
        </section>
      </div>
    </div>
  );
}
