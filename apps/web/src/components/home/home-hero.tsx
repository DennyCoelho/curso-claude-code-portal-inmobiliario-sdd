import Link from "next/link";
import { HomeSearch } from "./home-search";
import { NeighborhoodIllustration } from "./neighborhood-illustration";

export function HomeHero() {
  return (
    <section aria-labelledby="home-title" className="-mt-6 overflow-hidden rounded-3xl bg-[#e9f0e8] p-5 sm:-mt-8 sm:p-9 lg:p-12">
      <div className="grid items-center gap-4 pb-7 lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:pb-8">
        <div>
          <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-emerald-800 uppercase">
            <span aria-hidden="true" className="size-2 rounded-full bg-emerald-700" />
            Seu próximo endereço, no Brasil
          </p>
          <h1 id="home-title" className="max-w-xl font-serif text-4xl leading-[1.08] tracking-tight text-emerald-950 sm:text-5xl lg:text-6xl">
            Um novo lugar.
            <span className="block text-emerald-800">Uma nova história.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-600 sm:text-lg">
            Encontre o espaço para viver o que vem a seguir. Explore imóveis
            para comprar ou alugar e descubra novas possibilidades.
          </p>
        </div>
        <div className="mx-auto hidden w-full max-w-md sm:block" aria-hidden="true">
          <NeighborhoodIllustration />
        </div>
      </div>
      <HomeSearch />
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-emerald-900">
        <span className="text-slate-600">Comece por aqui:</span>
        <Link href="/properties?operation=SALE" className="font-medium underline-offset-4 hover:underline">
          Quero comprar <span aria-hidden="true">↗</span>
        </Link>
        <Link href="/properties?operation=RENT" className="font-medium underline-offset-4 hover:underline">
          Quero alugar <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
