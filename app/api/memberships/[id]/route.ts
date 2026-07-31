import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";
import { canManageMembers, ORG_ROLES } from "@/lib/auth/roles";

const updateSchema = z.object({
  role: z.enum(ORG_ROLES),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = updateSchema.parse(body);
    const { supabase, session, orgId, role } = await getRouteContext();

    if (!canManageMembers(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("memberships")
      .update({ role: payload.role })
      .eq("org_id", orgId)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "update", "membership", id, { role: payload.role });
    return NextResponse.json(data);
  } catch (error) {
    return respondWithError(error, { action: "update-membership" });
  }
}
