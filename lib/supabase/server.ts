// File: lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function getServerSupabase() {
  // Next 15: cookies() is async iterable but can be passed directly
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => (await cookies()).getAll(),
        setAll: async (cookiesToSet) => {
          const jar = await cookies();
          cookiesToSet.forEach(({ name, value, options }) => jar.set(name, value, options));
        },
      },
    }
  );
}
