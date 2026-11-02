import Link from "next/link";
import { formatHomePrice, propertyTypeLabels, type HomeProperty } from "@/lib/home";

interface HomePropertySectionProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  properties: HomeProperty[];
  href: string;
  linkLabel: string;
  emptyMessage: string;
  status: "loading" | "error" | "ready";
}

export function HomePropertySection({
  id, eyebrow, title, description, properties, href, linkLabel, emptyMessage, status,
}: HomePropertySectionProps) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <p className="mb-2 text-xs font-semibold tracking-[0.15em] text-emerald-800 uppercase">{eyebrow}</p>
      <h2 id={id} className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      {status === "ready" && properties.length > 0 ? (
        <ul className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
          {properties.map((property) => (
            <li key={property.id} className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:gap-5">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium text-emerald-800">
                  {propertyTypeLabels[property.type]} · {property.operation === "SALE" ? "À venda" : "Aluguel"}
                </p>
                <h3 className="text-base leading-6 font-semibold text-slate-900 wrap-anywhere">{property.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 wrap-anywhere">
                  {property.neighborhood}, {property.city} — {property.state}
                </p>
              </div>
              <p className="shrink-0 self-start text-base font-semibold text-slate-900 sm:pt-5">
                {formatHomePrice(property)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-7 text-sm leading-6 text-slate-600">
          {status === "loading" ? "Carregando imóveis…" : status === "error"
            ? "Esta seleção está indisponível no momento." : emptyMessage}
        </p>
      )}
      <Link href={href} className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">
        {linkLabel} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
