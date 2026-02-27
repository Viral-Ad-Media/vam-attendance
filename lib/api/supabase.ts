import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors";

export type RouteContext = {
  supabase: SupabaseClient;
  session: Session;
  orgId: string;
};

export async function getRouteContext(): Promise<RouteContext> {
  const cookieStore = await cookies();
  const cookieOrg = cookieStore.get("vam_active_org")?.value || null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    throw new ApiError("Supabase env vars missing", 500, "SUPABASE_CONFIG_MISSING");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError("Unauthorized", 401, "UNAUTHENTICATED");
  }

  const meta = user.app_metadata || {};
  const userMeta = user.user_metadata || {};
  let orgId = (meta as any).org_id || (userMeta as any).default_org_id || cookieOrg;

  // Fallback: pick the first org the user owns if metadata/cookie missing.
  if (!orgId) {
    const { data: orgRows, error: orgErr } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (orgErr) {
      // Surface the underlying RLS/permission issue
      throw orgErr;
    }

    if (orgRows && orgRows.length > 0) {
      orgId = orgRows[0].id as string;
      cookieStore.set("vam_active_org", orgId, {
        sameSite: "lax",
        path: "/",
        httpOnly: true,
      });
    }
  }

  // Fallback 2: pick the first org where the user has a membership
  if (!orgId) {
    const { data: memberRows, error: memberErr } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (memberErr) {
      throw memberErr;
    }

    if (memberRows && memberRows.length > 0) {
      orgId = memberRows[0].org_id as string;
      cookieStore.set("vam_active_org", orgId, {
        sameSite: "lax",
        path: "/",
        httpOnly: true,
      });
    }
  }

  if (!orgId) {
    throw new ApiError("Organization not set for user", 400, "ORG_NOT_SET");
  }

  // Fetch session after authenticating user to keep downstream shape
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { supabase, session: session!, orgId: String(orgId) };
}
