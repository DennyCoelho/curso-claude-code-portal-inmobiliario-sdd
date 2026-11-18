"use client";

import Link from "next/link";
import { useRef, useState, type InputHTMLAttributes } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthenticatedUser } from "@portal-inmobiliario/contracts/auth";
import { changeEmailSchema, changePasswordSchema, updateProfileSchema, type ChangeEmailInput, type ChangePasswordInput, type UpdateProfileInput } from "@portal-inmobiliario/contracts/account";
import { changeAccountPassword, requestEmailChange, updateProfile } from "@/lib/api/account";
import { ActionButton } from "@/components/ui/loading-feedback";
import { PasswordCriteria, PasswordMatch } from "@/components/auth/password-feedback";

const buttonClass = "min-h-11 rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900";
const inputClass = "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900";
type OnUpdated = (user: AuthenticatedUser) => void | Promise<void>;

function useAccountOperation() {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function clear() { setError(""); setMessage(""); }
  async function execute(operation: () => Promise<string>) {
    if (lock.current) return;
    lock.current = true; setPending(true); clear();
    try { setMessage(await operation()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível concluir a operação."); }
    finally { lock.current = false; setPending(false); }
  }
  return { pending, error, message, clear, execute };
}

function OperationFeedback({ error, message }: { error: string; message: string }) {
  return <>
    {error ? <div className="space-y-2"><p role="alert" className="text-sm leading-6 text-red-700">{error}</p><Link href="/login" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline underline-offset-4">Gerenciar sessão</Link></div> : null}
    <p role="status" className="text-sm leading-6 text-emerald-800">{message}</p>
  </>;
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  registration: UseFormRegisterReturn; label: string; error?: string;
  visible?: boolean; onToggle?: () => void;
};
function AccountField({ registration, label, error, visible, onToggle, ...attributes }: FieldProps) {
  const visibilityLabel = label === "Confirmar nova senha" ? "confirmação da nova senha" : label.toLocaleLowerCase("pt-BR");
  return <div className="min-w-0">
    <label htmlFor={attributes.id} className="mb-2 block text-sm font-semibold">{label}</label>
    <div className="relative">
      <input {...registration} {...attributes} type={onToggle ? visible ? "text" : "password" : attributes.type}
        aria-invalid={Boolean(error)} aria-describedby={[attributes["aria-describedby"], error ? `${attributes.id}-error` : ""].filter(Boolean).join(" ") || undefined}
        className={`${inputClass}${onToggle ? " pr-14" : ""}`} />
      {onToggle ? <button type="button" onClick={onToggle} aria-label={`${visible ? "Ocultar" : "Mostrar"} ${visibilityLabel}`}
        aria-controls={attributes.id} aria-pressed={visible}
        className="absolute inset-y-0 right-1 flex min-h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
        <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible ? <path d="m3 3 18 18" /> : null}</svg>
      </button> : null}
    </div>
    {error ? <p id={`${attributes.id}-error`} role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
  </div>;
}

export function ProfileNameForm({ name, onUpdated }: { name: string; onUpdated: OnUpdated }) {
  const form = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileSchema), defaultValues: { name } });
  const operation = useAccountOperation();
  return <form method="post" action="/api/account/profile" noValidate aria-label="Editar nome" aria-busy={operation.pending} className="space-y-4" onSubmit={(event) => {
    event.preventDefault(); void form.handleSubmit((input) => operation.execute(async () => {
      const { user } = await updateProfile(input); form.reset({ name: user.name }); await onUpdated(user); return "Nome atualizado com sucesso.";
    }), operation.clear)(event);
  }}>
    <fieldset disabled={operation.pending} className="min-w-0 space-y-4 disabled:opacity-70">
      <legend className="sr-only">Dados pessoais</legend>
      <AccountField registration={form.register("name")} id="profile-name" label="Nome" type="text" autoComplete="name" maxLength={100} required
        error={form.formState.errors.name ? "Informe seu nome com 2 a 100 caracteres." : undefined} />
      <ActionButton type="submit" pending={operation.pending} pendingLabel="Salvando alterações…" className={buttonClass}>Salvar alterações</ActionButton>
    </fieldset>
    <OperationFeedback {...operation} />
  </form>;
}

export function EmailChangeForm({ email }: { email: string }) {
  const form = useForm<ChangeEmailInput>({ resolver: zodResolver(changeEmailSchema), defaultValues: { email, currentPassword: "" } });
  const operation = useAccountOperation();
  const [visible, setVisible] = useState(false);
  return <form method="post" action="/api/account/email-change" noValidate aria-label="Alterar e-mail" aria-busy={operation.pending} className="space-y-4" onSubmit={(event) => {
    event.preventDefault(); void form.handleSubmit((input) => operation.execute(async () => {
      const response = await requestEmailChange(input); form.resetField("currentPassword"); setVisible(false); return response.message;
    }), operation.clear)(event);
  }}>
    <p className="text-sm leading-6 text-slate-600">Informe o novo endereço e confirme sua senha atual. O e-mail de acesso só muda após a confirmação pelo link enviado, válido por 30 minutos.</p>
    <fieldset disabled={operation.pending} className="min-w-0 space-y-4 disabled:opacity-70">
      <legend className="sr-only">Novo e-mail e verificação de identidade</legend>
      <AccountField registration={form.register("email")} id="profile-email" label="Novo e-mail" type="email" autoComplete="email" maxLength={254} required
        error={form.formState.errors.email ? "Informe um e-mail válido." : undefined} />
      <AccountField registration={form.register("currentPassword")} id="email-current-password" label="Senha atual para alterar e-mail" autoComplete="current-password" maxLength={128} required
        visible={visible} onToggle={() => setVisible((value) => !value)} error={form.formState.errors.currentPassword?.message} />
      <ActionButton type="submit" pending={operation.pending} pendingLabel="Enviando confirmação…" className={buttonClass}>Enviar link de confirmação</ActionButton>
    </fieldset>
    <OperationFeedback {...operation} />
  </form>;
}

export function PasswordChangeForm({ onUpdated }: { onUpdated: OnUpdated }) {
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const [currentPassword, newPassword, confirmPassword] = useWatch({ control: form.control, name: ["currentPassword", "newPassword", "confirmPassword"] });
  const started = Boolean(currentPassword || newPassword || confirmPassword);
  const operation = useAccountOperation();
  const [visible, setVisible] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  return <form method="post" action="/api/account/password" noValidate aria-label="Alterar senha" aria-busy={operation.pending} className="space-y-4" onSubmit={(event) => {
    event.preventDefault(); void form.handleSubmit((input) => operation.execute(async () => {
      const result = await changeAccountPassword(input);
      form.reset(); setVisible({ currentPassword: false, newPassword: false, confirmPassword: false });
      await onUpdated(result.user);
      return result.changed ? "Senha alterada com sucesso. As sessões dos outros dispositivos foram encerradas." : "Sua senha atual foi mantida.";
    }), operation.clear)(event);
  }}>
    <p id="account-password-optional" className="text-sm leading-6 text-slate-600">Opcional. Deixe os três campos em branco para manter sua senha atual. Para trocar, preencha todos eles.</p>
    <fieldset disabled={operation.pending} className="min-w-0 space-y-4 disabled:opacity-70">
      <legend className="sr-only">Verifique sua senha atual e defina a nova senha</legend>
      {([
        ["currentPassword", "Senha atual", "current-password"],
        ["newPassword", "Nova senha", "new-password"],
        ["confirmPassword", "Confirmar nova senha", "new-password"],
      ] as const).map(([name, label, autoComplete]) => <div key={name}>
        <AccountField registration={form.register(name, { deps: (["currentPassword", "newPassword", "confirmPassword"] as const).filter((field) => field !== name) })}
          id={`account-${name}`} label={label} autoComplete={autoComplete} maxLength={128} required={started}
          visible={visible[name]} onToggle={() => setVisible((values) => ({ ...values, [name]: !values[name] }))}
          aria-describedby={`account-password-optional${name === "newPassword" ? " account-new-password-help" : name === "confirmPassword" ? " account-password-match" : ""}`}
          error={form.formState.errors[name]?.message} />
        {name === "newPassword" ? <PasswordCriteria password={newPassword} id="account-new-password-help" /> : null}
        {name === "confirmPassword" ? <PasswordMatch password={newPassword} confirmation={confirmPassword} id="account-password-match" /> : null}
      </div>)}
      <ActionButton type="submit" pending={operation.pending} pendingLabel="Alterando senha…" className={buttonClass}>Alterar senha</ActionButton>
    </fieldset>
    <OperationFeedback {...operation} />
  </form>;
}
