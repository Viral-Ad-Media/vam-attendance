import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors";
import { isPlatformSuperadmin, normalizeOrgRole, type EffectiveRole } from "@/lib/auth/roles";
import { getServiceClient } from "@/lib/supabase/service";

export type RouteContext = {
  supabase: SupabaseClient;
  session: Session;
  orgId: string;
  role: EffectiveRole;
  isSuperadmin: boolean;
  teacherId: string | null;
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
  const isSuperadmin = isPlatformSuperadmin(user);

  // Superadmins are not scoped to any single org's RLS policies — use the
  // service-role client so they can read/write any organization's data.
  const dataClient = isSuperadmin ? getServiceClient() : supabase;

  let orgId = cookieOrg || readString(appMeta, "org_id") || readString(userMeta, "default_org_id");

  // Fallback: pick the first org the user owns (or, for superadmins with no
  // org of their own, the first organization that exists at all).
  if (!orgId) {
    const { data: orgRows, error: orgErr } = isSuperadmin
      ? await dataClient.from("organizations").select("id").order("created_at", { ascending: true }).limit(1)
      : await dataClient.from("organizations").select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1);

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
    const { data: memberRows, error: memberErr } = await dataClient
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

  let orgRole: EffectiveRole = null;

  if (isSuperadmin) {
    orgRole = "superadmin";
  } else {
    // Never trust cookie/metadata alone: verify user can access this org,
    // and resolve their role for it from the membership row.
    const { data: membershipRow, error: membershipError } = await dataClient
      .from("memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) {
      throw membershipError;
    }

    if (membershipRow) {
      orgRole = normalizeOrgRole(membershipRow.role as string);
    } else {
      const { data: ownerRow, error: ownerError } = await dataClient
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
      orgRole = "admin";
    }
  }

  // Fetch session after authenticating user to keep downstream shape
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new ApiError("Unauthorized", 401, "UNAUTHENTICATED");
  }

  let teacherId: string | null = null;
  if (orgRole === "teacher") {
    const { data: teacherRow, error: teacherErr } = await dataClient
      .from("teachers")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (teacherErr) throw teacherErr;
    teacherId = teacherRow?.id ?? null;
  }

  return {
    supabase: dataClient,
    session: { ...session, user },
    orgId: String(orgId),
    role: orgRole,
    isSuperadmin,
    teacherId,
  };
}

/** Required before any service-role operation on behalf of an org member. */
export function requireOrgAdmin(role: EffectiveRole): void {
  if (role !== "admin" && role !== "superadmin") {
    throw new ApiError("Forbidden: administrator access required", 403, "ADMIN_REQUIRED");
  }
}

/** Validate session visibility and ownership before mutations or email side effects. */
export async function requireSessionAccess(context: RouteContext, sessionId: string, write = false): Promise<void> {
  if (write && context.role !== "admin" && context.role !== "superadmin" && context.role !== "teacher") {
    throw new ApiError("Forbidden", 403, "WRITE_ACCESS_DENIED");
  }
  let query = context.supabase.from("sessions").select("id")
    .eq("org_id", context.orgId).eq("id", sessionId);
  if (context.role === "teacher") {
    if (!context.teacherId) throw new ApiError("Session not found", 404, "SESSION_NOT_FOUND");
    query = query.eq("teacher_id", context.teacherId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError("Session not found", 404, "SESSION_NOT_FOUND");
}
