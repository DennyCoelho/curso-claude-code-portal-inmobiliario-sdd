"use client";

import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import type { AuthenticatedUser } from "@portal-inmobiliario/contracts/auth";
import { EmailChangeForm, PasswordChangeForm, ProfileNameForm } from "./account-forms";

export function AccountSettings({ user }: { user: AuthenticatedUser }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  async function onUpdated(updated: AuthenticatedUser) {
    await mutate("/api/auth/me", updated, { revalidate: false });
    router.refresh();
  }
  return <div className="grid gap-6 lg:grid-cols-2">
    <section aria-labelledby="account-edit-title" className="min-w-0 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 id="account-edit-title" className="text-xl font-semibold tracking-tight">Editar perfil</h2>
      <ProfileNameForm name={user.name} onUpdated={onUpdated} />
      <details className="border-t border-slate-200 pt-5">
        <summary className="cursor-pointer rounded-lg py-3 font-semibold text-emerald-800">Alterar e-mail</summary>
        <div className="mt-4"><EmailChangeForm email={user.email} /></div>
      </details>
    </section>
    <section aria-labelledby="account-security-title" className="min-w-0 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 id="account-security-title" className="text-xl font-semibold tracking-tight">Alterar senha</h2>
      <PasswordChangeForm onUpdated={onUpdated} />
    </section>
  </div>;
}
