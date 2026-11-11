import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";
import { buildPropertyMapLinks, type PropertyMapLocation } from "@/lib/property-map";

interface PropertyMapProps {
  property: PropertyMapLocation & Pick<PublicProperty, "title">;
  zoom?: string;
}

export function PropertyMap({ property, zoom }: PropertyMapProps) {
  const { embedHref, externalHref } = buildPropertyMapLinks(property, zoom);

  return (
    <div className="mt-5 min-w-0 space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-emerald-50">
        <iframe
          title={`Mapa da localização de ${property.title}`}
          src={embedHref}
          width="100%"
          height="320"
          loading="lazy"
          referrerPolicy="no-referrer"
          allowFullScreen
          className="block h-72 w-full border-0 sm:h-80"
        />
      </div>
      <p className="text-xs leading-6 text-slate-500">Localização aproximada com base no endereço informado.</p>
      <a href={externalHref} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">
        Abrir no Google Maps <span aria-hidden="true">↗</span><span className="sr-only"> (abre em nova aba)</span>
      </a>
      <p className="text-xs leading-6 text-slate-500">Se o mapa não carregar, use o link para consultar a localização.</p>
    </div>
  );
}
