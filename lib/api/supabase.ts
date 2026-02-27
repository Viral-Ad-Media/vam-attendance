import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors";

export type RouteContext = {
  supabase: SupabaseClient;
  session: Session;
  orgId: string;
};

type MetadataMap = Record<string, unknown>;

function asMetadataMap(input: unknown): MetadataMap {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as MetadataMap;
  }
  return {};
}

function readString(map: MetadataMap, key: string): string | null {
  const value = map[key];
  return typeof value === "string" ? value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function getRouteContext(): Promise<RouteContext> {
  const cookieStore = await cookies();
  const rawCookieOrg = cookieStore.get("vam_active_org")?.value || null;
  const cookieOrg = rawCookieOrg && isUuid(rawCookieOrg) ? rawCookieOrg : null;
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

  const appMeta = asMetadataMap(user.app_metadata);
  const userMeta = asMetadataMap(user.user_metadata);
  let orgId = readString(appMeta, "org_id") || readString(userMeta, "default_org_id") || cookieOrg;

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

  // Never trust cookie/metadata alone: verify user can access this org.
  const { data: membershipRow, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) {
    throw membershipError;
  }

  if (!membershipRow) {
    const { data: ownerRow, error: ownerError } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (ownerError) {
      throw ownerError;
    }
    if (!ownerRow) {
      throw new ApiError("Forbidden: organization access denied", 403, "ORG_ACCESS_DENIED");
    }
  }

  // Fetch session after authenticating user to keep downstream shape
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new ApiError("Unauthorized", 401, "UNAUTHENTICATED");
  }

  return { supabase, session, orgId: String(orgId) };
}
