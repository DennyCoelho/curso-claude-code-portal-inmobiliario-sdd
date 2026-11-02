import Link from "next/link";
import { HomeHero } from "@/components/home/home-hero";
import { HomePropertyCollections } from "@/components/home/home-property-collections";

export default function Home() {
  return (
    <div className="space-y-14 sm:space-y-18">
      <HomeHero />
      <HomePropertyCollections />
      <section aria-labelledby="home-next-step" className="flex flex-col items-start justify-between gap-7 rounded-2xl bg-emerald-900 px-6 py-9 text-white sm:p-10 lg:flex-row lg:items-center">
        <div>
          <p className="mb-3 text-xs font-medium tracking-[0.15em] text-emerald-200 uppercase">Seu próximo capítulo</p>
          <h2 id="home-next-step" className="max-w-lg font-serif text-3xl leading-tight sm:text-4xl">
            Tudo começa com um lugar para chamar de seu.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-emerald-100">
            Seja para comprar ou alugar, encontre novas possibilidades no Portal Imobiliário.
          </p>
        </div>
        <Link href="/properties" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-4 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">
          Encontrar meu próximo imóvel <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
