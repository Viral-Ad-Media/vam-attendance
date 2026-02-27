// lib/supabase/client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached:
  | ReturnType<typeof createBrowserClient>
  | null
  | undefined = undefined;

export function getBrowserSupabase() {
  // Only run in the browser
  if (typeof window === "undefined") return null;

  if (cached !== undefined) return cached ?? null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Don't throw during build; return null and let the UI handle it.
    cached = null;
    return null;
  }

  cached = createBrowserClient(url, key);
  return cached;
}
