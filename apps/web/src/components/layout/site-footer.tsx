import Link from "next/link";
import { publicNavigation } from "@/lib/navigation";
import { SiteBrand } from "./site-brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link href="/" aria-label="Portal Inmobiliario, inicio" className="inline-flex">
              <SiteBrand />
            </Link>
            <p className="max-w-sm text-sm leading-6 text-slate-600">
              Propiedades en venta y arriendo en Chile.
            </p>
          </div>
          <nav aria-label="Navegación del pie de página">
            <ul className="grid grid-cols-2 gap-x-6 sm:flex sm:flex-wrap sm:gap-x-4">
              {publicNavigation.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center text-sm text-slate-600 underline-offset-4 hover:text-emerald-800 hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-6 border-t border-slate-100 pt-6 text-xs leading-5 text-slate-500">
          © Portal Inmobiliario.
        </p>
      </div>
    </footer>
  );
}
