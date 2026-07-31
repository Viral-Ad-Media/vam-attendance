import { NextResponse } from "next/server";
import { getRouteContext } from "@/lib/api/supabase";
import { respondWithError } from "@/lib/api/errors";
import { canManageMembers, isSuperadminMetadata, normalizeOrgRole } from "@/lib/auth/roles";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const { supabase, orgId, role, isSuperadmin } = await getRouteContext();

    if (!canManageMembers(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: memberships, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const userIds = Array.from(new Set((memberships ?? []).map((m) => m.user_id as string)));
    const usersById = new Map<string, { full_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);
      if (usersError) throw usersError;
      for (const u of users ?? []) {
        usersById.set(u.id as string, { full_name: u.full_name as string | null, email: u.email as string | null });
      }
    }

    // Only superadmins can see/toggle the platform-wide superadmin flag —
    // it lives on auth user metadata, so resolving it costs one admin call per member.
    const superadminByUserId = new Map<string, boolean>();
    if (isSuperadmin && userIds.length > 0) {
      const service = getServiceClient();
      await Promise.all(
        userIds.map(async (id) => {
          const { data } = await service.auth.admin.getUserById(id);
          superadminByUserId.set(id, isSuperadminMetadata(data?.user?.app_metadata?.role as string | undefined));
        })
      );
    }

    const enriched = (memberships ?? []).map((m) => ({
      ...m,
      role: normalizeOrgRole(m.role as string) ?? m.role,
      full_name: usersById.get(m.user_id as string)?.full_name ?? null,
      email: usersById.get(m.user_id as string)?.email ?? null,
      is_superadmin: isSuperadmin ? superadminByUserId.get(m.user_id as string) ?? false : undefined,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return respondWithError(error, { action: "list-memberships" });
  }
}
