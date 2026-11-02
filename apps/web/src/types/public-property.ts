export interface PublicProperty {
  id: string;
  title: string;
  description: string;
  operation: "SALE" | "RENT";
  type: "HOUSE" | "APARTMENT" | "LAND" | "OFFICE" | "COMMERCIAL" | "OTHER";
  price: string;
  usableArea: string | null;
  totalArea: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  age: number | null;
  address: string;
  addressNumber: string;
  addressComplement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  images: {
    id: string;
    url: string;
    position: number;
    isMain: boolean;
  }[];
  features: {
    id: string;
    name: string;
  }[];
}
