import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Página não encontrada
      </h1>
      <p className="text-base leading-7 text-slate-600">
        Não encontramos a página que você procurou.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium text-emerald-800 underline underline-offset-4 hover:bg-emerald-50"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
