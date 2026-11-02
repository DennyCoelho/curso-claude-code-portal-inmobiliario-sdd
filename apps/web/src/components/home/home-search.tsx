"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  buildHomeSearchUrl,
  homeSearchSchema,
  type HomeSearchValues,
} from "@/lib/home-search";

export function HomeSearch() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<HomeSearchValues>({
    resolver: zodResolver(homeSearchSchema),
    defaultValues: { search: "", operation: "" },
  });

  return (
    <form
      role="search"
      aria-label="Buscar imóveis"
      action="/properties"
      method="get"
      onSubmit={handleSubmit((values) => router.push(buildHomeSearchUrl(values)))}
      className="relative z-10 rounded-2xl border border-emerald-900/10 bg-white p-3 shadow-[0_8px_30px_-16px_#064e3b33] sm:p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1 px-2 py-1">
          <label htmlFor="home-search" className="mb-2 block text-sm font-semibold text-slate-900">
            Onde você quer viver?
          </label>
          <input
            {...register("search")}
            id="home-search"
            type="search"
            placeholder="Busque por bairro, cidade ou imóvel"
            maxLength={200}
            aria-invalid={Boolean(errors.search)}
            aria-describedby={errors.search ? "home-search-error" : undefined}
            className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-500"
          />
        </div>
        <div className="px-2 py-1 lg:w-52">
          <label htmlFor="home-operation" className="mb-2 block text-sm font-semibold text-slate-900">
            Quero
          </label>
          <select
            {...register("operation")}
            id="home-operation"
            className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-700"
          >
            <option value="">Comprar ou alugar</option>
            <option value="SALE">Comprar</option>
            <option value="RENT">Alugar</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex min-h-13 items-center justify-center gap-3 rounded-xl bg-emerald-800 px-7 py-3 font-semibold text-white transition-colors hover:bg-emerald-900 lg:mb-1"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Buscar imóveis
        </button>
      </div>
      {errors.search && (
        <p id="home-search-error" role="alert" className="mt-2 px-2 text-sm text-red-700">
          {errors.search.message}
        </p>
      )}
    </form>
  );
}
