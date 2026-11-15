"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function usePendingNavigation() {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  function navigate(url: string, options?: { scroll?: boolean }) {
    if (!isNavigating) startTransition(() => router.push(url, options));
  }
  return { isNavigating, navigate };
}
