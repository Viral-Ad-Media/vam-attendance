import { cookies } from "next/headers";
import { ApiError } from "./errors";
import {
  isPlatformSuperadmin,
  normalizeOrgRole,
  type EffectiveRole,
} from "@/lib/auth/roles";
import { getAppSession } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/db/client";
import type { DatabaseClient } from "@/lib/db/query";

export type RouteContext = {
  db: DatabaseClient;
  session: NonNullable<Awaited<ReturnType<typeof getAppSession>>>;
  orgId: string;
  role: EffectiveRole;
  isSuperadmin: boolean;
  teacherId: string | null;
};
export async function getRouteContext(): Promise<RouteContext> {
  const session = await getAppSession();
  if (!session) throw new ApiError("Unauthorized", 401, "UNAUTHENTICATED");
  const user = session.user;
  const isSuperadmin = isPlatformSuperadmin(user);
  const db = createDatabaseClient(isSuperadmin ? undefined : user.id);
  const cookie = (await cookies()).get("vam_active_org")?.value;
  const selected =
    cookie || user.app_metadata.org_id || user.user_metadata.default_org_id;
  let orgId =
    typeof selected === "string" && /^[0-9a-f-]{36}$/i.test(selected)
      ? selected
      : null;
  if (!orgId) {
    const { data, error } = await db
      .from("memberships")
      .select("org_id")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1);
    if (error) throw error;
    orgId = data?.[0]?.org_id ?? null;
    if (!orgId) {
      let query = db
        .from("organizations")
        .select("id")
        .order("created_at")
        .limit(1);
      if (!isSuperadmin) query = query.eq("owner_id", user.id);
      const result = await query;
      if (result.error) throw result.error;
      orgId = result.data?.[0]?.id ?? null;
    }
  }
  if (!orgId)
    throw new ApiError("Organization not set for user", 400, "ORG_NOT_SET");
  let role: EffectiveRole = isSuperadmin ? "superadmin" : null;
  if (!isSuperadmin) {
    const membership = await db
      .from("memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership.error) throw membership.error;
    role = normalizeOrgRole(membership.data?.role);
    if (!role) {
      const owner = await db
        .from("organizations")
        .select("id")
        .eq("id", orgId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (owner.error) throw owner.error;
      if (!owner.data)
        throw new ApiError(
          "Organization access denied",
          403,
          "ORG_ACCESS_DENIED",
        );
      role = "admin";
    }
  }
  let teacherId: string | null = null;
  if (role === "teacher") {
    const teacher = await db
      .from("teachers")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (teacher.error) throw teacher.error;
    teacherId = teacher.data?.id ?? null;
  }
  return { db, session, orgId, role, isSuperadmin, teacherId };
}

/** Required before any service-role operation on behalf of an org member. */
export function requireOrgAdmin(role: EffectiveRole): void {
  if (role !== "admin" && role !== "superadmin") {
    throw new ApiError(
      "Forbidden: administrator access required",
      403,
      "ADMIN_REQUIRED",
    );
  }
}

/** Validate session visibility and ownership before mutations or email side effects. */
export async function requireSessionAccess(
  context: RouteContext,
  sessionId: string,
  write = false,
): Promise<void> {
  if (
    write &&
    context.role !== "admin" &&
    context.role !== "superadmin" &&
    context.role !== "teacher"
  ) {
    throw new ApiError("Forbidden", 403, "WRITE_ACCESS_DENIED");
  }
  let query = context.db
    .from("sessions")
    .select("id")
    .eq("org_id", context.orgId)
    .eq("id", sessionId);
  if (context.role === "teacher") {
    if (!context.teacherId)
      throw new ApiError("Session not found", 404, "SESSION_NOT_FOUND");
    query = query.eq("teacher_id", context.teacherId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError("Session not found", 404, "SESSION_NOT_FOUND");
}
