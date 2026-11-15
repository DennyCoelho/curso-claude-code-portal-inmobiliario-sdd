"use client";

import { useRef, useState } from "react";
import { ActionButton } from "./loading-feedback";

export function RetryButton({ onRetry, className = "" }: { onRetry: () => void | Promise<unknown>; className?: string }) {
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  async function retry() {
    if (running.current) return;
    running.current = true;
    setPending(true);
    try {
      await onRetry();
    } catch {
      // A origem da consulta mantém a mensagem de erro e permite outra tentativa.
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return <ActionButton type="button" pending={pending} pendingLabel="Tentando novamente…" onClick={() => { void retry(); }} className={className}>Tentar novamente</ActionButton>;
}
