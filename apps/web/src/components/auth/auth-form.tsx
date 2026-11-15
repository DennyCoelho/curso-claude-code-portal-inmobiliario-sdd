"use client";

import { useRef, useState } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginPasswordSchema, passwordSchema, registerSchema, type AuthenticatedUser } from "@portal-inmobiliario/contracts/auth";
import { requestAuth } from "@/lib/api/auth";
import { ActionButton } from "@/components/ui/loading-feedback";
import { PasswordCriteria, PasswordMatch } from "./password-feedback";

const inputClass = "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900";
type AuthFields = { name: string; email: string; password: string; confirmPassword: string };

function PasswordRequirements({ control }: { control: Control<AuthFields> }) {
  const password = useWatch({ control, name: "password" });
  return <PasswordCriteria password={password} id="auth-password-help" />;
}

function PasswordConfirmation({ control }: { control: Control<AuthFields> }) {
  const [password, confirmation] = useWatch({ control, name: ["password", "confirmPassword"] });
  return <PasswordMatch password={password} confirmation={confirmation} id="auth-confirmPassword-help" />;
}

export function AuthForm({ mode, onAuthenticated, onSubmitStart }: { mode: "login" | "register"; onAuthenticated: (user: AuthenticatedUser) => Promise<void>; onSubmitStart?: () => void }) {
  const schema = z.object({
    name: z.string().refine((value) => mode === "login" || registerSchema.shape.name.safeParse(value).success, "Informe seu nome com 2 a 100 caracteres."),
    email: registerSchema.shape.email,
    password: mode === "register" ? passwordSchema : loginPasswordSchema,
    confirmPassword: z.string(),
  }).superRefine((values, context) => {
    if (mode === "register" && (!values.confirmPassword || values.confirmPassword !== values.password)) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: values.confirmPassword ? "As senhas devem ser iguais." : "Confirme sua senha." });
    }
  });
  const { register, handleSubmit, resetField, control, formState: { errors } } = useForm<AuthFields>({
    resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const [isSending, setIsSending] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({ password: false, confirmPassword: false });
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const fields = [
    ...(mode === "register" ? [{ name: "name", label: "Nome", type: "text", autoComplete: "name", maxLength: 100, placeholder: "João de Souza" } as const] : []),
    { name: "email", label: "E-mail", type: "email", autoComplete: "email", maxLength: 254, placeholder: "seuemail@exemplo.com" },
    // Não truncar colagens: informar quando a senha do cadastro ultrapassa quinze caracteres.
    { name: "password", label: "Senha", type: "password", autoComplete: mode === "register" ? "new-password" : "current-password", maxLength: 128, placeholder: "Sua senha" },
    ...(mode === "register" ? [{ name: "confirmPassword", label: "Confirmar senha", type: "password", autoComplete: "new-password", maxLength: 128, placeholder: "Repita sua senha" } as const] : []),
  ] as const;

  async function submit(values: z.infer<typeof schema>) {
    if (sending.current) return;
    sending.current = true;
    setIsSending(true);
    setError(null);
    try {
      onSubmitStart?.();
      const user = await requestAuth(mode, mode === "register" ? { ...values, name: values.name.trim() } : { email: values.email, password: values.password });
      if (!user) throw new Error("Não foi possível confirmar sua sessão.");
      resetField("password");
      resetField("confirmPassword");
      setVisiblePasswords({ password: false, confirmPassword: false });
      await onAuthenticated(user);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível concluir a autenticação.");
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }

  return (
    <form method="post" action={`/api/auth/${mode}`} noValidate aria-busy={isSending} className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!sending.current) void handleSubmit(submit, () => setError(null))(event);
      }}>
      <fieldset disabled={isSending} className="min-w-0 space-y-5 disabled:opacity-70">
        <legend className="sr-only">{mode === "register" ? "Dados para criar sua conta" : "Dados para entrar"}</legend>
        {fields.map(({ name, label, ...attributes }) => {
          const passwordField = name === "password" || name === "confirmPassword" ? name : null;
          const isVisible = passwordField ? visiblePasswords[passwordField] : false;
          const toggleLabel = `${isVisible ? "Ocultar" : "Mostrar"} ${name === "confirmPassword" ? "confirmação de senha" : "senha"}`;
          return (
          <div key={name}>
            <label htmlFor={`auth-${name}`} className="mb-2 block text-sm font-semibold text-slate-900">{label} <span aria-hidden="true">*</span></label>
            <div className="relative">
            <input {...register(name, mode === "register" && name === "password" ? { deps: ["confirmPassword"] } : {})} {...attributes} id={`auth-${name}`} required
              type={passwordField ? isVisible ? "text" : "password" : attributes.type}
              aria-invalid={Boolean(errors[name])}
              aria-describedby={[
                mode === "register" && (name === "password" || name === "confirmPassword") ? `auth-${name}-help` : "",
                errors[name] ? `auth-${name}-error` : "",
              ].filter(Boolean).join(" ") || undefined}
              className={`${inputClass}${passwordField ? " pr-14" : ""}`} />
            {passwordField ? (
              <button type="button" disabled={isSending} aria-label={toggleLabel} title={toggleLabel}
                aria-controls={`auth-${name}`} aria-pressed={isVisible}
                onClick={() => setVisiblePasswords((current) => ({ ...current, [passwordField]: !current[passwordField] }))}
                className="absolute inset-y-0 right-1 flex min-h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-wait">
                <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {isVisible ? <path d="m3 3 18 18" /> : null}
                </svg>
              </button>
            ) : null}
            </div>
            {mode === "register" && name === "password" ? <PasswordRequirements control={control} /> : null}
            {mode === "register" && name === "confirmPassword" ? <PasswordConfirmation control={control} /> : null}
            {errors[name] ? <p id={`auth-${name}-error`} role="alert" className="mt-2 text-sm text-red-700">{name === "email" ? "Informe um e-mail válido." : errors[name].message}</p> : null}
          </div>
          );
        })}
        <ActionButton type="submit" pending={isSending} pendingLabel={mode === "register" ? "Criando conta…" : "Entrando…"} className="min-h-11 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">
          {mode === "register" ? "Criar conta" : "Entrar"}
        </ActionButton>
      </fieldset>
      <p role="status" className="text-sm text-slate-600">{isSending ? "Confirmando seus dados…" : ""}</p>
      {error ? <p role="alert" className="text-sm leading-6 text-red-700">{error}</p> : null}
    </form>
  );
}
