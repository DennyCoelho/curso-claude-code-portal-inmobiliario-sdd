"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { requestAuth } from "@/lib/api/auth";
import { AuthForm } from "./auth-form";
import { ActionButton, LoadingStatus } from "@/components/ui/loading-feedback";
import { RetryButton } from "@/components/ui/retry-button";

export function AuthPanel({ mode }: { mode: "login" | "register" }) {
  const { data: user, error, isLoading, isValidating, mutate } = useAuth();
  const [isLeaving, setIsLeaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const leaving = useRef(false);

  async function logout() {
    if (leaving.current) return;
    leaving.current = true;
    setIsLeaving(true);
    setMessage(null);
    try {
      await requestAuth("logout");
      await mutate(null, { revalidate: false });
      setMessage("Você saiu da sua conta.");
    } catch {
      setMessage("Não foi possível confirmar a saída. Tente novamente.");
    } finally {
      leaving.current = false;
      setIsLeaving(false);
    }
  }

  return (
    <div aria-busy={isLoading || isValidating || isLeaving} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      {isLoading ? <LoadingStatus>Verificando sua sessão…</LoadingStatus> : error ? (
        <div className="space-y-4">
          <p role="alert">Não foi possível verificar sua sessão.</p>
          <RetryButton onRetry={() => mutate()} className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold" />
        </div>
      ) : user ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Você está conectado</h2>
          <p className="wrap-anywhere text-slate-700">Olá, {user.name}. Sua sessão está ativa para {user.email}.</p>
          <Link href="/properties" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Explorar imóveis</Link>
          <div><ActionButton type="button" pending={isLeaving} pendingLabel="Saindo…" onClick={() => { void logout(); }} className="min-h-11 rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50">Sair da conta</ActionButton></div>
        </div>
      ) : (
        <div className="space-y-5">
          <AuthForm key={mode} mode={mode} onSubmitStart={() => setMessage(null)} onAuthenticated={async (authenticated) => { setMessage("Acesso confirmado com sucesso."); await mutate(authenticated, { revalidate: false }); }} />
          <p className="text-sm text-slate-700">{mode === "login" ? "Ainda não tem conta? " : "Já tem uma conta? "}
            <Link href={mode === "login" ? "/register" : "/login"} className="font-semibold text-emerald-800 underline underline-offset-4">{mode === "login" ? "Criar conta" : "Entrar"}</Link>
          </p>
        </div>
      )}
      {isValidating && !isLoading && !error ? <LoadingStatus className="mt-4 text-slate-600">Atualizando sua sessão…</LoadingStatus> : null}
      <p role="status" className="mt-4 text-sm leading-6 text-slate-700">{message}</p>
    </div>
  );
}
