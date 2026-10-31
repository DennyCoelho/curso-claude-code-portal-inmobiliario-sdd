export const publicNavigation = [
  { label: "Início", href: "/" },
  { label: "Imóveis", href: "/properties" },
  { label: "Comprar", href: "/properties?operation=SALE" },
  { label: "Alugar", href: "/properties?operation=RENT" },
  { label: "Entrar", href: "/login" },
] as const;
