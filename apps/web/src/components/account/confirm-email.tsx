"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { useSWRConfig } from "swr";
import { emailChangeTokenSchema } from "@portal-inmobiliario/contracts/account";
import { confirmEmailChange } from "@/lib/api/account";
import { ActionButton, LoadingStatus } from "@/components/ui/loading-feedback";

export function EmailConfirmationForm({ token }: { token: string | null }) {
  const valid = emailChangeTokenSchema.safeParse(token).success;
  const { mutate } = useSWRConfig();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function confirm() {
    if (!valid || !token || lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const { user } = await confirmEmailChange({ token });
      await mutate("/api/auth/me", user, { revalidate: false });
      window.history.replaceState(window.history.state, "", window.location.pathname);
      setDone(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível confirmar seu e-mail."); }
    finally { lock.current = false; setPending(false); }
  }
  return <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
    {done ? <p role="status" className="leading-7 text-emerald-800">E-mail atualizado com sucesso. Use o novo endereço para entrar. As sessões dos outros dispositivos foram encerradas.</p>
      : !valid ? <p role="alert">Este link é inválido ou está incompleto. Solicite uma nova mudança de e-mail na sua conta.</p>
        : <>
          <p className="leading-7 text-slate-700">Confirme o novo endereço de e-mail. Você precisa estar conectado à conta que solicitou a mudança.</p>
          <ActionButton type="button" onClick={() => void confirm()} pending={pending} pendingLabel="Confirmando e-mail…"
            className="min-h-11 rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Confirmar novo e-mail</ActionButton>
          {error ? <p role="alert" className="text-sm leading-6 text-red-700">{error}</p> : null}
        </>}
    <div className="flex flex-wrap gap-4">
      <Link href="/account" prefetch={false} className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4">Minha conta</Link>
      {!done ? <Link href="/login" prefetch={false} className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4">Entrar na conta</Link> : null}
    </div>
  </div>;
}
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
const readFragment = () => window.location.hash;
const serverFragment = () => null;
export function EmailConfirmationPanel() {
  const fragment = useSyncExternalStore(subscribe, readFragment, serverFragment);
  if (fragment === null) return <LoadingStatus>Verificando o link…</LoadingStatus>;
  const tokens = new URLSearchParams(fragment.slice(1)).getAll("token");
  return <EmailConfirmationForm key={fragment} token={tokens.length === 1 ? tokens[0] : null} />;
}
