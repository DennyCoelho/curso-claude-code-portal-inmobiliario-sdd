"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, PASSWORD_RECOVERY_MESSAGE, type ForgotPasswordInput } from "@portal-inmobiliario/contracts/auth";
import { requestPasswordRecovery } from "@/lib/api/password-recovery";
import { ActionButton } from "@/components/ui/loading-feedback";

const linkClass = "inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4";

export function ForgotPasswordForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const [isSending, setIsSending] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);

  async function submit(input: ForgotPasswordInput) {
    if (sending.current) return;
    sending.current = true;
    setIsSending(true);
    setError(null);
    try {
      await requestPasswordRecovery("forgot-password", input);
      setIsAccepted(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível solicitar a recuperação de senha.");
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      {isAccepted ? (
        <div className="space-y-4">
          <p role="status" className="leading-7 text-slate-700">{PASSWORD_RECOVERY_MESSAGE}</p>
          <p className="text-sm leading-6 text-slate-600">O link vale por 30 minutos. Ao pedir outro, o link anterior deixa de funcionar.</p>
          <button type="button" className={linkClass} onClick={() => { setIsAccepted(false); setError(null); }}>Tentar com outro e-mail ou solicitar novamente</button>
        </div>
      ) : (
        <form method="post" action="/api/auth/forgot-password" noValidate aria-busy={isSending} className="space-y-5"
          onSubmit={(event) => { event.preventDefault(); if (!sending.current) void handleSubmit(submit, () => setError(null))(event); }}>
          <fieldset disabled={isSending} className="min-w-0 space-y-5 disabled:opacity-70">
            <legend className="sr-only">Dados para recuperar sua senha</legend>
            <div>
              <label htmlFor="recovery-email" className="mb-2 block text-sm font-semibold">E-mail <span aria-hidden="true">*</span></label>
              <input {...register("email")} id="recovery-email" type="email" autoComplete="email" required maxLength={254} placeholder="seuemail@exemplo.com"
                aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "recovery-email-error" : undefined}
                className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900" />
              {errors.email ? <p id="recovery-email-error" role="alert" className="mt-2 text-sm text-red-700">Informe um e-mail válido.</p> : null}
            </div>
            <ActionButton type="submit" pending={isSending} pendingLabel="Solicitando link…" className="min-h-11 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Enviar link de recuperação</ActionButton>
          </fieldset>
          {error ? <p role="alert" className="text-sm leading-6 text-red-700">{error}</p> : null}
        </form>
      )}
      <Link href="/login" className={linkClass}>Voltar para entrar</Link>
    </div>
  );
}
