export function SiteBrand() {
  return (
    <span className="inline-flex items-center gap-3">
      <svg
        aria-hidden="true"
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        className="shrink-0 rounded-xl bg-emerald-800 text-white"
      >
        <path
          d="m10 19 10-8 10 8M13 17v13h14V17M18 30v-8h4v8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-base leading-5 font-semibold tracking-tight text-slate-900">
        Portal
        <span className="block text-sm font-normal tracking-normal text-slate-600">
          Imobiliário
        </span>
      </span>
    </span>
  );
}
