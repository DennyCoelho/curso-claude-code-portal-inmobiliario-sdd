"use client";

import useSWR from "swr";
import { requestAuth } from "@/lib/api/auth";

const fetchCurrentUser = () => requestAuth("me");

export function useAuth() {
  return useSWR("/api/auth/me", fetchCurrentUser, {
    shouldRetryOnError: false,
    dedupingInterval: 5_000,
  });
}
