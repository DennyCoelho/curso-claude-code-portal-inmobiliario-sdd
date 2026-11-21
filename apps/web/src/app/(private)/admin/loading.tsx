import { LoadingStatus } from "@/components/ui/loading-feedback";

export default function AdminLoading() {
  return (
    <div className="max-w-5xl space-y-6" aria-busy="true">
      <LoadingStatus>Carregando painel administrativo…</LoadingStatus>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-48 rounded-2xl bg-slate-200 motion-safe:animate-pulse" />)}
      </div>
    </div>
  );
}
