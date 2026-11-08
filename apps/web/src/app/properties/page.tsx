import { PropertyCatalog } from "@/components/properties/property-catalog";
import { PropertyCatalogSearch } from "@/components/properties/property-catalog-search";
import { PropertyCatalogLayout } from "@/components/properties/property-catalog-layout";

export default async function PropertiesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = new URLSearchParams();
  for (const [name, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      parameters.append(name, item);
    }
  }
  const query = parameters.toString();

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
      <PropertyCatalogSearch key={query} parameters={query} />
      <PropertyCatalogLayout parameters={query}>
        <PropertyCatalog parameters={query} />
      </PropertyCatalogLayout>
    </div>
  );
}
