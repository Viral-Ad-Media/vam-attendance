// Server-only Supabase client (uses Service Role key).
// Never import this in Client Components.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (singleton) return singleton;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  // Auth disabled for service client — no cookies/session.
  singleton = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { "X-Client-Info": "vam-dashboard-service" },
    },
  });

  return singleton;
}
