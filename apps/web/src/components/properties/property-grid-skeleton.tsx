export function PropertyGridSkeleton() {
  return (
    <div aria-hidden="true" className="property-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white motion-safe:animate-pulse">
          <div className="aspect-[4/3] bg-slate-200" />
          <div className="space-y-4 p-5">
            <div className="h-3 w-1/3 rounded bg-slate-200" />
            <div className="h-6 w-4/5 rounded bg-slate-200" />
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-7 w-1/2 rounded bg-slate-200" />
            <div className="flex gap-4 border-t border-slate-100 pt-4">
              <div className="h-4 w-1/4 rounded bg-slate-100" />
              <div className="h-4 w-1/4 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
