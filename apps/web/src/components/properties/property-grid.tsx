import type { PropertyCardData } from "@/lib/property";
import { PropertyCard } from "./property-card";

interface PropertyGridProps {
  properties: readonly PropertyCardData[];
  catalogParameters?: string;
}

export function PropertyGrid({ properties, catalogParameters }: PropertyGridProps) {
  return (
    <ul className="property-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <li key={property.id} className="min-w-0">
          <PropertyCard property={property} catalogParameters={catalogParameters} />
        </li>
      ))}
    </ul>
  );
}
