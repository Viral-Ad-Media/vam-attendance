import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, Session } from "@supabase/supabase-js";

type OrgContext = {
  supabase: SupabaseClient;
  session: Session | null;
  orgId: string | null;
  orgName: string | null;
};

export async function getServerSupabaseWithSession(): Promise<OrgContext> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const meta = session?.user?.app_metadata || {};
  const userMeta = session?.user?.user_metadata || {};
  const orgId = (meta as any).org_id || (userMeta as any).default_org_id || null;
  const orgName = (meta as any).org_name || (userMeta as any).org_name || null;

  return { supabase, session, orgId, orgName };
}

export function assertOrg(orgId: string | null): string {
  if (!orgId) {
    throw new Error("Organization not set in user session");
  }
  return orgId;
}
