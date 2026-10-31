import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Imobiliário",
  description: "Portal imobiliário com imóveis à venda e para aluguel no Brasil.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main-content"
          className="sr-only rounded-lg bg-emerald-800 px-4 py-3 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-5 py-12 sm:px-8 sm:py-16"
        >
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
