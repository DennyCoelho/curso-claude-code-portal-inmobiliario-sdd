import type { ButtonHTMLAttributes, ReactNode } from "react";

export function LoadingSpinner() {
  return (
    <svg aria-hidden="true" focusable="false" className="size-4 shrink-0 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingStatus({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p role="status" className={`flex items-center gap-2 text-sm ${className}`}><LoadingSpinner />{children}</p>;
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; pendingLabel: string };

export function ActionButton({ pending = false, pendingLabel, disabled, children, className = "", ...props }: ActionButtonProps) {
  return (
    <button {...props} disabled={disabled || pending} aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70 ${className}`}>
      {pending ? <><LoadingSpinner />{pendingLabel}</> : children}
    </button>
  );
}
