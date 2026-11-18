"use client";

import Link from "next/link";
import { useState } from "react";
import type { PropertyCardData } from "@/lib/property";
import { ActionButton, LoadingSpinner } from "@/components/ui/loading-feedback";
import { RetryButton } from "@/components/ui/retry-button";
import { useFavorites } from "./favorites-provider";

const buttonStyle = "min-h-11 w-full rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50";

export function FavoriteButton({ property }: { property: PropertyCardData }) {
  const favorites = useFavorites();
  return <FavoriteButtonState key={favorites?.userId ?? "visitor"} property={property} />;
}

function FavoriteButtonState({ property }: { property: PropertyCardData }) {
  const favorites = useFavorites();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  if (favorites?.loading) return <button type="button" disabled aria-busy="true" className={`inline-flex items-center justify-center gap-2 ${buttonStyle}`}><LoadingSpinner />Carregando favoritos…</button>;
  if (favorites?.error) return <div className="space-y-2"><p className="text-sm text-slate-600">Favoritos indisponíveis.</p><RetryButton onRetry={favorites.retry} className={buttonStyle} /></div>;
  if (!favorites?.userId) return <Link href="/login?next=%2Faccount" prefetch={false} aria-label={`Entrar para salvar ${property.title}`} className={`inline-flex items-center justify-center ${buttonStyle}`}>Entrar para salvar</Link>;
  const saved = favorites.ids?.includes(property.id) ?? false;
  const pending = favorites.pending.has(`${favorites.userId}:${property.id}`);

  async function toggle(button: HTMLButtonElement) {
    const hadFocus = document.activeElement === button;
    setMessage(""); setFailed(false);
    try {
      if (await favorites!.change(property, !saved, () => {
        if (saved && hadFocus && button.isConnected && (document.activeElement === button || document.activeElement === document.body)
          && button.closest('[aria-labelledby="account-favorites-title"]')) {
          document.getElementById("account-favorites-title")?.focus();
        }
      })) {
        setMessage(saved ? "Imóvel removido dos favoritos." : "Imóvel salvo nos favoritos.");
      }
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Não foi possível alterar seus favoritos. Tente novamente.");
    }
  }

  return <div className="space-y-2">
    <ActionButton type="button" aria-pressed={saved} aria-label={`${saved ? "Remover dos" : "Salvar nos"} favoritos: ${property.title}`}
      pending={pending} pendingLabel={saved ? "Removendo…" : "Salvando…"} onClick={(event) => { void toggle(event.currentTarget); }} className={buttonStyle}>
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>{saved ? "Remover dos favoritos" : "Salvar nos favoritos"}
    </ActionButton>
    {message ? <p role={failed ? "alert" : "status"} className="text-sm leading-6 text-slate-600">{message}</p> : null}
  </div>;
}
