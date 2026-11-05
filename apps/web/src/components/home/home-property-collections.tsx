"use client";

import useSWR from "swr";
import { fetchHomeProperties } from "@/lib/api/home-properties";
import { selectHomeProperties } from "@/lib/home";
import { HomePropertySection } from "./home-property-section";

export function HomePropertyCollections() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/properties", fetchHomeProperties,
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  const groups = selectHomeProperties(data ?? []);
  const status = isLoading ? "loading" : error ? "error" : "ready";

  return (
    <div className="space-y-14" aria-busy={isLoading}>
      {isLoading && <p role="status" className="sr-only">Carregando as seleções de imóveis.</p>}
      {error && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p>Não foi possível carregar os imóveis. Tente novamente em instantes.</p>
          <button type="button" onClick={() => void mutate()} className="min-h-11 shrink-0 rounded-lg border border-amber-300 px-4 font-semibold hover:bg-amber-100">
            Tentar novamente
          </button>
        </div>
      )}
      <HomePropertySection
        id="featured-properties"
        eyebrow="Uma seleção para começar"
        title="Imóveis em destaque"
        description="Conheça algumas das opções em destaque no portal e encontre o seu ponto de partida."
        properties={groups.featured}
        href="/properties"
        linkLabel="Explorar todos os imóveis"
        emptyMessage="Ainda não há imóveis em destaque. Explore as demais opções do portal."
        status={status}
      />
      <div className="space-y-14 border-t border-slate-200 pt-12">
        <HomePropertySection
          id="sale-properties"
          eyebrow="Para chamar de seu"
          title="Imóveis à venda"
          description="Um espaço para criar raízes e dar forma aos seus planos."
          properties={groups.sale}
          href="/properties?operation=SALE"
          linkLabel="Ver opções para comprar"
          emptyMessage="Nenhum imóvel à venda disponível no momento. Volte em breve."
          status={status}
        />
        <HomePropertySection
          id="rent-properties"
          eyebrow="Liberdade para mudar"
          title="Imóveis para alugar"
          description="Novas possibilidades para acompanhar o seu momento de vida."
          properties={groups.rent}
          href="/properties?operation=RENT"
          linkLabel="Ver opções para alugar"
          emptyMessage="Nenhum imóvel para alugar disponível no momento. Volte em breve."
          status={status}
        />
      </div>
    </div>
  );
}
