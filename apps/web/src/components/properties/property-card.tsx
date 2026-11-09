import Link from "next/link";
import { buildPropertyDetailHref } from "@/lib/property-navigation";
import {
  formatPropertyArea,
  formatPropertyPrice,
  propertyTypeLabels,
  selectPropertyImage,
  type PropertyCardData,
} from "@/lib/property";
import { PropertyImage } from "./property-image";

interface PropertyCardProps {
  property: PropertyCardData;
  catalogParameters?: string;
}

export function PropertyCard({ property, catalogParameters = "" }: PropertyCardProps) {
  const image = selectPropertyImage(property.images);
  const area = property.usableArea ?? property.totalArea;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <Link href={buildPropertyDetailHref(property.id, catalogParameters)} prefetch={false}
        aria-label={`Ver detalhes de ${property.title}`} className="flex h-full flex-1 flex-col hover:bg-slate-50 focus-visible:outline-offset-[-4px]">
        <div className="relative aspect-[4/3] bg-emerald-50">
          <PropertyImage key={image?.url ?? "no-image"} src={image?.url} title={property.title} />
          <p className="absolute top-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm">
            {property.operation === "SALE" ? "À venda" : "Aluguel"}
          </p>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs font-medium text-emerald-800">{propertyTypeLabels[property.type]}</p>
          <h3 className="mt-2 text-lg leading-7 font-semibold text-slate-900 wrap-anywhere">{property.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 wrap-anywhere">
            {property.neighborhood}, {property.city} — {property.state}
          </p>
          <p className="mt-4 mb-5 text-xl leading-7 font-semibold tracking-tight text-slate-900 wrap-anywhere">
            {formatPropertyPrice(property)}
          </p>
          {property.bedrooms !== null || property.bathrooms !== null || area !== null ? (
            <dl className="mt-auto flex flex-wrap gap-x-5 gap-y-3 border-t border-slate-100 pt-4 text-sm text-slate-700">
              {property.bedrooms !== null ? (
                <div>
                  <dt className="sr-only">{property.bedrooms === 1 ? "Quarto" : "Quartos"}</dt>
                  <dd>{property.bedrooms} {property.bedrooms === 1 ? "quarto" : "quartos"}</dd>
                </div>
              ) : null}
              {property.bathrooms !== null ? (
                <div>
                  <dt className="sr-only">{property.bathrooms === 1 ? "Banheiro" : "Banheiros"}</dt>
                  <dd>{property.bathrooms} {property.bathrooms === 1 ? "banheiro" : "banheiros"}</dd>
                </div>
              ) : null}
              {area !== null ? (
                <div>
                  <dt className="text-xs text-slate-500">{property.usableArea !== null ? "Área útil" : "Área total"}</dt>
                  <dd>{formatPropertyArea(area)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
