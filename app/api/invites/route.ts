import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";
import { getServiceClient } from "@/lib/supabase/service";
import { sendInviteEmail } from "@/lib/api/invite-email";
import { randomBytes } from "crypto";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "teacher", "student", "viewer"]),
});

export async function GET() {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("invites")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-invites" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = inviteSchema.parse(body);
    const { supabase, orgId, session } = await getRouteContext();
    const service = getServiceClient();

    const inviteEmail = payload.email.trim().toLowerCase();
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();
    const orgName = orgData?.name ?? null;

    // Generate token
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Insert invite
    const { data: invite, error: insertError } = await supabase
      .from("invites")
      .insert([
        {
          org_id: orgId,
          email: inviteEmail,
          role: payload.role,
          token,
          expires_at: expiresAt,
          invited_by: session.user.id,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // Send email
    try {
      await sendInviteEmail({
        inviteEmail,
        organizationName: orgName,
        token,
        role: payload.role,
      });
    } catch (emailError) {
      console.error("Invite email failed", emailError);
      // Continue anyway - invite was created
    }

    await logAudit(supabase, orgId, session.user.id, "create", "invite", invite.id, {
      email: inviteEmail,
      role: payload.role,
    });

    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    return respondWithError(error, { action: "create-invite" });
  }
}
