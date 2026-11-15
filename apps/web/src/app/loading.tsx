import { LoadingStatus } from "@/components/ui/loading-feedback";

export default function Loading() {
  return <section aria-label="Carregamento da página" aria-busy="true" className="py-8 text-slate-600"><LoadingStatus>Carregando página…</LoadingStatus></section>;
}
