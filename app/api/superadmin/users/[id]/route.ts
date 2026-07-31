import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";
import { getServiceClient } from "@/lib/supabase/service";

const updateSchema = z.object({
  superadmin: z.boolean(),
});

/**
 * Grants or revokes the platform-wide "superadmin" role for a user.
 * Superadmin is stored on the auth user's app_metadata, not on a
 * per-organization membership row — it is not org-scoped.
 * Only existing superadmins may call this.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = updateSchema.parse(body);
    const { session, orgId, isSuperadmin } = await getRouteContext();

    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const service = getServiceClient();
    const { data: targetUser, error: getUserError } = await service.auth.admin.getUserById(id);
    if (getUserError) throw getUserError;
    if (!targetUser?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const nextAppMetadata = {
      ...targetUser.user.app_metadata,
      role: payload.superadmin ? "superadmin" : null,
    };

    const { error: updateError } = await service.auth.admin.updateUserById(id, {
      app_metadata: nextAppMetadata,
    });
    if (updateError) throw updateError;

    await logAudit(service, orgId, session.user.id, "update", "user-role", id, {
      superadmin: payload.superadmin,
    });

    return NextResponse.json({ success: true, superadmin: payload.superadmin });
  } catch (error) {
    return respondWithError(error, { action: "update-superadmin" });
  }
}
