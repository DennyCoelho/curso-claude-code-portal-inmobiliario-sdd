import { PropertyCatalog } from "@/components/properties/property-catalog";

export default function PropertiesPage() {
  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <p className="mb-3 text-xs font-semibold tracking-[0.15em] text-emerald-800 uppercase">
          Encontre seu próximo espaço
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Imóveis</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Explore imóveis à venda e para alugar em diferentes cidades do Brasil.
          Conheça as opções e descubra um lugar para os seus planos.
        </p>
      </header>
      <PropertyCatalog />
    </div>
  );
}
