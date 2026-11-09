import { notFound } from "next/navigation";
import { PropertyDetails } from "@/components/properties/property-details";
import { fetchPublicProperty } from "@/lib/api/properties";
import { getPropertyCatalogHref } from "@/lib/property-navigation";

export default async function PropertyPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, parameters] = await Promise.all([params, searchParams]);
  const property = await fetchPublicProperty(id, process.env.API_URL ?? "http://127.0.0.1:3001");
  if (!property) notFound();
  return <PropertyDetails property={property} catalogHref={getPropertyCatalogHref(parameters.from)} />;
}
