"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFieldsSchema, type ContactFields } from "@portal-inmobiliario/contracts/property-contact";
import { submitPropertyContact } from "@/lib/api/contact";
import { formatContactMobile } from "@/lib/contact-phone";
import { ActionButton } from "@/components/ui/loading-feedback";

const fields = [
  { name: "name", label: "Nome", type: "text", autoComplete: "name", maxLength: 100, placeholder: "João de Souza" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email", maxLength: 254, placeholder: "seuemail@exemplo.com" },
  { name: "phone", label: "Telefone com DDD", type: "tel", autoComplete: "tel", maxLength: 30, placeholder: "(99) 99999-9999" },
] as const;

const inputClassName = "min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900";

export function PropertyContactForm({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFields>({
    resolver: zodResolver(contactFieldsSchema),
    defaultValues: { name: "", email: "", phone: "", message: "", botcheck: "" },
  });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const sending = useRef(false);

  async function onSubmit(values: ContactFields) {
    if (sending.current) return;
    sending.current = true;
    setIsSending(true);
    setResult(null);
    try {
      const response = await submitPropertyContact({ ...values, propertyId });
      reset();
      setResult(response);
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : "Não foi possível enviar a solicitação." });
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }

  return (
    <section aria-labelledby="property-contact-title" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="property-contact-title" className="text-xl font-semibold text-slate-900">Tenho interesse</h2>
      <p id="property-contact-description" className="mt-3 text-sm leading-6 text-slate-600 wrap-anywhere">
        Solicite mais informações sobre {propertyTitle}.
      </p>
      <form method="post" action="/api/contact" noValidate onSubmit={(event) => {
        event.preventDefault();
        if (!sending.current) void handleSubmit(onSubmit, () => setResult(null))(event);
      }} aria-describedby="property-contact-description" aria-busy={isSending} className="mt-5 space-y-4">
        <fieldset disabled={isSending} className="min-w-0 space-y-4 disabled:opacity-70">
          <legend className="sr-only">Seus dados de contato</legend>
          {fields.map(({ name, label, ...attributes }) => {
            const registration = register(name);
            return (
            <div key={name}>
              <label htmlFor={`contact-${name}`} className="mb-2 block text-sm font-semibold text-slate-900">{label} <span aria-hidden="true">*</span></label>
              <input {...registration} {...attributes} id={`contact-${name}`} required
                inputMode={name === "phone" ? "numeric" : undefined}
                onChange={(event) => {
                  if (name === "phone") {
                    const input = event.target;
                    const formatted = formatContactMobile(input.value, input.selectionStart ?? input.value.length);
                    input.value = formatted.value;
                    input.setSelectionRange(formatted.caret, formatted.caret);
                  }
                  void registration.onChange(event);
                }}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={errors[name] ? `contact-${name}-error` : name === "phone" ? "contact-phone-help" : undefined}
                className={inputClassName} />
              {name === "phone" ? <p id="contact-phone-help" className="mt-1 text-xs leading-5 text-slate-500">Informe o DDD e os 9 dígitos do celular.</p> : null}
              {errors[name] ? <p id={`contact-${name}-error`} role="alert" className="mt-1 text-sm text-red-700">{errors[name].message}</p> : null}
            </div>
            );
          })}
          <div>
            <label htmlFor="contact-message" className="mb-2 block text-sm font-semibold text-slate-900">Mensagem <span aria-hidden="true">*</span></label>
            <textarea {...register("message")} id="contact-message" required minLength={10} maxLength={3000} rows={5} placeholder="Escreva sua mensagem aqui"
              aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error" : undefined}
              className={`${inputClassName} resize-y`} />
            {errors.message ? <p id="contact-message-error" role="alert" className="mt-1 text-sm text-red-700">{errors.message.message}</p> : null}
          </div>
          <input {...register("botcheck")} type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <p className="text-xs leading-6 text-slate-500">Ao enviar, seus dados serão usados para responder à solicitação e processados pelo Web3Forms.</p>
          <ActionButton type="submit" pending={isSending} pendingLabel="Enviando…" className="min-h-11 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Enviar solicitação</ActionButton>
        </fieldset>
        <p role="status" aria-live="polite" className="text-sm text-slate-600">{isSending ? "Enviando sua solicitação…" : result?.success ? result.message : ""}</p>
        {result && !result.success ? <p role="alert" className="text-sm leading-6 text-red-700">{result.message} Seus dados foram mantidos.</p> : null}
      </form>
    </section>
  );
}
