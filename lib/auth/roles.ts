/**
 * Central role model for VAM Attendance.
 *
 * Two independent layers:
 * - Platform role: "superadmin" lives on the auth user's app_metadata.role.
 *   It is NOT org-scoped — a superadmin can access every organization.
 * - Org role: stored on the `memberships` row for (org_id, user_id). Legacy
 *   rows use "owner" for the org creator; it is treated as equivalent to
 *   "admin" everywhere permissions are checked.
 */

export const ORG_ROLES = ["admin", "teacher", "student", "viewer"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export type EffectiveRole = "superadmin" | OrgRole | null;

/** Normalizes legacy/raw membership role values onto the current role set. */
export function normalizeOrgRole(raw: string | null | undefined): OrgRole | null {
  if (!raw) return null;
  if (raw === "owner") return "admin";
  if ((ORG_ROLES as readonly string[]).includes(raw)) return raw as OrgRole;
  return null;
}

export function isSuperadminMetadata(role: string | null | undefined): boolean {
  return role === "superadmin";
}

/** Can `actorRole` change a member's role to `targetRole` within an org? */
export function canAssignRole(actorRole: EffectiveRole): boolean {
  return actorRole === "superadmin" || actorRole === "admin";
}

export function canManageMembers(actorRole: EffectiveRole): boolean {
  return actorRole === "superadmin" || actorRole === "admin";
}

export function canGrantSuperadmin(actorRole: EffectiveRole): boolean {
  return actorRole === "superadmin";
}

/** Platform privileges must come only from server-managed app metadata. */
export function isPlatformSuperadmin(user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  return user?.app_metadata?.role === "superadmin";
}
