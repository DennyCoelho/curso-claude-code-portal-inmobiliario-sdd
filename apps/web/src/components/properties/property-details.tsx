import Link from "next/link";
import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";
import { formatPropertyArea, formatPropertyPrice, propertyTypeLabels, selectPropertyImage } from "@/lib/property";
import { PropertyImage } from "./property-image";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" });

export function PropertyDetails({ property, catalogHref = "/properties" }: { property: PublicProperty; catalogHref?: string }) {
  const image = selectPropertyImage(property.images);
  const facts = [
    { label: "Área útil", value: property.usableArea === null ? null : formatPropertyArea(property.usableArea) },
    { label: "Área total", value: property.totalArea === null ? null : formatPropertyArea(property.totalArea) },
    { label: "Quartos", value: property.bedrooms },
    { label: "Banheiros", value: property.bathrooms },
    { label: "Vagas de garagem", value: property.parkingSpaces },
    { label: "Idade do imóvel", value: property.age === null ? null : property.age === 0 ? "Novo" : `${property.age} ${property.age === 1 ? "ano" : "anos"}` },
  ].filter(({ value }) => value !== null);

  return (
    <article aria-labelledby="property-title" className="min-w-0 space-y-8">
      <Link href={catalogHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">
        <span aria-hidden="true">←</span> Voltar aos imóveis
      </Link>
      <header className="flex min-w-0 flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-900">{property.operation === "SALE" ? "À venda" : "Aluguel"}</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">{propertyTypeLabels[property.type]}</span>
            {property.isFeatured ? <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-900">Destaque</span> : null}
          </div>
          <h1 id="property-title" className="text-3xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-4xl">{property.title}</h1>
          <p className="mt-3 text-base leading-7 text-slate-600 wrap-anywhere">{property.neighborhood}, {property.city} — {property.state}</p>
        </div>
        <div className="min-w-0 shrink-0 lg:max-w-sm lg:text-right">
          <p className="text-sm text-slate-500">{property.operation === "RENT" ? "Aluguel mensal" : "Valor de venda"}</p>
          <p className="mt-1 text-3xl leading-tight font-semibold tracking-tight text-emerald-900 wrap-anywhere">{formatPropertyPrice(property)}</p>
        </div>
      </header>
      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-emerald-50">
            <PropertyImage key={image?.url ?? "no-image"} src={image?.url} title={property.title}
              sizes="(min-width: 1280px) 730px, (min-width: 1024px) 60vw, (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)" preload />
          </div>
          <section aria-labelledby="property-description-title" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 id="property-description-title" className="text-xl font-semibold text-slate-900">Sobre o imóvel</h2>
            <p className="mt-4 text-base leading-8 whitespace-pre-line text-slate-600 wrap-anywhere">{property.description.trim() || "Descrição não informada."}</p>
          </section>
          <section aria-labelledby="property-features-title" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 id="property-features-title" className="text-xl font-semibold text-slate-900">Características</h2>
            {property.features.length ? (
              <ul className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                {property.features.map((feature) => <li key={feature.id} className="flex min-w-0 items-start gap-2 wrap-anywhere"><span aria-hidden="true" className="font-semibold text-emerald-700">✓</span>{feature.name}</li>)}
              </ul>
            ) : <p className="mt-4 text-sm leading-6 text-slate-600">Características não informadas.</p>}
          </section>
        </div>
        <div className="min-w-0 space-y-6">
          {facts.length ? (
            <section aria-labelledby="property-facts-title" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 id="property-facts-title" className="text-xl font-semibold text-slate-900">Informações do imóvel</h2>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
                {facts.map(({ label, value }) => <div key={label} className="min-w-0"><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 text-lg font-semibold text-slate-900 wrap-anywhere">{value}</dd></div>)}
              </dl>
            </section>
          ) : null}
          <section aria-labelledby="property-address-title" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 id="property-address-title" className="text-xl font-semibold text-slate-900">Localização</h2>
            <address className="mt-4 space-y-1 text-sm leading-7 text-slate-600 not-italic wrap-anywhere">
              <p>{property.address}, {property.addressNumber}</p>
              {property.addressComplement ? <p>{property.addressComplement}</p> : null}
              <p>{property.neighborhood}</p>
              <p>{property.city} — {property.state}</p>
              <p>CEP {property.postalCode.slice(0, 5)}-{property.postalCode.slice(5)}</p>
              <p>Brasil</p>
            </address>
          </section>
          <p className="text-xs leading-6 text-slate-500">
            Cadastrado em <time dateTime={property.createdAt}>{dateFormatter.format(new Date(property.createdAt))}</time>.<br />
            Atualizado em <time dateTime={property.updatedAt}>{dateFormatter.format(new Date(property.updatedAt))}</time>.
          </p>
        </div>
      </div>
    </article>
  );
}
