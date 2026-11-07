"use client";

import useSWR from "swr";
import { fetchPublicProperties } from "@/lib/api/properties";
import type { PropertyListItem } from "@/lib/property";

export function usePublicProperties(url: string | null = "/api/properties") {
  return useSWR<PropertyListItem[], Error>(url, fetchPublicProperties, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
}
