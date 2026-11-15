"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, resetTokenSchema, type ResetPasswordInput } from "@portal-inmobiliario/contracts/auth";
import { useSWRConfig } from "swr";
import { requestPasswordRecovery } from "@/lib/api/password-recovery";
import { ActionButton, LoadingStatus } from "@/components/ui/loading-feedback";
import { PasswordCriteria, PasswordMatch } from "./password-feedback";

const linkClass = "inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4";

function ResetPasswordFeedback({ control }: { control: Control<ResetPasswordInput> }) {
  const [password, confirmation] = useWatch({ control, name: ["password", "confirmPassword"] });
  return <><PasswordCriteria password={password} id="reset-password-help" /><PasswordMatch password={password} confirmation={confirmation} id="reset-confirmPassword-help" /></>;
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const validToken = resetTokenSchema.safeParse(token).success;
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema), defaultValues: { token: token ?? "", password: "", confirmPassword: "" },
  });
  const { mutate } = useSWRConfig();
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [visible, setVisible] = useState({ password: false, confirmPassword: false });
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);

  async function submit(input: ResetPasswordInput) {
    if (sending.current) return;
    sending.current = true;
    setIsSending(true);
    setError(null);
    try {
      await requestPasswordRecovery("reset-password", input);
      reset({ token: "", password: "", confirmPassword: "" });
      setVisible({ password: false, confirmPassword: false });
      window.history.replaceState(window.history.state, "", window.location.pathname);
      setIsComplete(true);
      // A recuperação revoga as sessões; atualizar a navegação sem exigir outra consulta.
      await mutate("/api/auth/me", null, { revalidate: false });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível redefinir sua senha.");
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      {isComplete ? (
        <><p role="status" className="leading-7 text-emerald-800">Senha redefinida com sucesso. Suas sessões anteriores foram encerradas.</p><Link href="/login" className={linkClass}>Entrar com a nova senha</Link></>
      ) : !validToken ? (
        <p role="alert" className="leading-7 text-slate-700">Este link é inválido ou está incompleto. Solicite um novo link de recuperação.</p>
      ) : (
        <form method="post" action="/api/auth/reset-password" noValidate aria-busy={isSending} className="space-y-5"
          onSubmit={(event) => { event.preventDefault(); if (!sending.current) void handleSubmit(submit, () => setError(null))(event); }}>
          <fieldset disabled={isSending} className="min-w-0 space-y-5 disabled:opacity-70">
            <legend className="sr-only">Defina e confirme sua nova senha</legend>
            {(["password", "confirmPassword"] as const).map((name) => (
              <div key={name}>
                <label htmlFor={`reset-${name}`} className="mb-2 block text-sm font-semibold">{name === "password" ? "Nova senha" : "Confirmar nova senha"} <span aria-hidden="true">*</span></label>
                <div className="relative">
                  <input {...register(name, name === "password" ? { deps: ["confirmPassword"] } : {})} id={`reset-${name}`} type={visible[name] ? "text" : "password"} autoComplete="new-password" required maxLength={128}
                    placeholder={name === "password" ? "Sua nova senha" : "Repita sua nova senha"} aria-invalid={Boolean(errors[name])}
                    aria-describedby={`reset-${name}-help${errors[name] ? ` reset-${name}-error` : ""}`}
                    className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 pr-14 text-base text-slate-900" />
                  <button type="button" aria-label={`${visible[name] ? "Ocultar" : "Mostrar"} ${name === "password" ? "nova senha" : "confirmação de senha"}`} aria-controls={`reset-${name}`} aria-pressed={visible[name]}
                    onClick={() => setVisible((current) => ({ ...current, [name]: !current[name] }))}
                    className="absolute inset-y-0 right-1 flex min-h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                    <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible[name] ? <path d="m3 3 18 18" /> : null}</svg>
                  </button>
                </div>
                {errors[name] ? <p id={`reset-${name}-error`} role="alert" className="mt-2 text-sm text-red-700">{errors[name].message}</p> : null}
              </div>
            ))}
            <ResetPasswordFeedback control={control} />
            <ActionButton type="submit" pending={isSending} pendingLabel="Redefinindo senha…" className="min-h-11 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Salvar nova senha</ActionButton>
          </fieldset>
          {error ? <p role="alert" className="text-sm leading-6 text-red-700">{error}</p> : null}
        </form>
      )}
      {!isComplete ? <Link href="/forgot-password" className={linkClass}>Solicitar novo link de recuperação</Link> : null}
    </div>
  );
}

function subscribeToFragment(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
const readFragment = () => window.location.hash;
const serverFragment = () => null;

export function ResetPasswordPanel() {
  const fragment = useSyncExternalStore(subscribeToFragment, readFragment, serverFragment);
  if (fragment === null) return <LoadingStatus>Verificando o link…</LoadingStatus>;
  const tokens = new URLSearchParams(fragment.slice(1)).getAll("token");
  const token = tokens.length === 1 ? tokens[0] : null;
  return <ResetPasswordForm key={token} token={token} />;
}
