"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { publicNavigation } from "@/lib/navigation";
import { SiteBrand } from "./site-brand";

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header
      className="border-b border-slate-200 bg-white"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isMenuOpen) {
          closeMenu();
          menuButtonRef.current?.focus();
        }
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 px-5 py-4 sm:px-8">
        <Link href="/" aria-label="Portal Imobiliário, início" onNavigate={closeMenu}>
          <SiteBrand />
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 md:hidden"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d={isMenuOpen ? "m6 6 12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {isMenuOpen ? "Fechar" : "Menu"}
        </button>
        <nav
          id="primary-navigation"
          aria-label="Navegação principal"
          data-open={isMenuOpen}
          className="mt-4 hidden w-full border-t border-slate-200 pt-4 data-[open=true]:block md:mt-0 md:block md:w-auto md:border-0 md:pt-0"
        >
          <ul className="flex flex-col gap-1 md:flex-row md:items-center">
            {publicNavigation.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  onNavigate={closeMenu}
                  data-account={href === "/login"}
                  className="flex min-h-11 items-center rounded-lg px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 data-[account=true]:bg-emerald-800 data-[account=true]:text-white data-[account=true]:hover:bg-emerald-900 md:data-[account=true]:ml-3"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
