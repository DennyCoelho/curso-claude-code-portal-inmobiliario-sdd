"use client";

import useSWR from "swr";
import { fetchPublicProperties } from "@/lib/api/properties";
import type { PropertyListItem } from "@/lib/property";

export function usePublicProperties() {
  return useSWR<PropertyListItem[], Error>("/api/properties", fetchPublicProperties, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
}
