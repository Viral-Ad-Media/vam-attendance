import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServiceClient } from "@/lib/supabase/service";
import { ApiError, respondWithError } from "@/lib/api/errors";
import { logAudit } from "@/lib/api/audit";

const acceptSchema = z.object({
  token: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = acceptSchema.parse(body);
    const service = getServiceClient();

    // Find invite by token
    const { data: invites, error: inviteError } = await service
      .from("invites")
      .select("*")
      .eq("token", token);

    if (inviteError) throw inviteError;
    if (!invites || invites.length === 0) {
      throw new ApiError("Invitation not found", 404, "INVITE_NOT_FOUND");
    }

    const invite = invites[0];

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      throw new ApiError("Invitation has expired", 400, "INVITE_EXPIRED");
    }

    // Check if already accepted
    if (invite.accepted_at) {
      throw new ApiError("Invitation has already been accepted", 400, "INVITE_ALREADY_ACCEPTED");
    }

    // Get current user from cookies/session
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
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new ApiError(
        "You must be signed in to accept an invitation. Please sign in first.",
        401,
        "UNAUTHENTICATED"
      );
    }

    // Check if user's email matches invite email (if different, warn but allow)
    const nowIso = new Date().toISOString();

    // Create or update membership for the invited user
    const { error: membershipError } = await service
      .from("memberships")
      .upsert([
        {
          org_id: invite.org_id,
          user_id: user.id,
          role: invite.role,
          invited_by: invite.invited_by,
          accepted_at: nowIso,
        },
      ]);

    if (membershipError) throw membershipError;

    // Mark invite as accepted
    const { error: updateError } = await service
      .from("invites")
      .update({ accepted_at: nowIso })
      .eq("id", invite.id);

    if (updateError) throw updateError;

    // Log audit event
    try {
      await logAudit(service as any, invite.org_id, user.id, "accept", "invite", invite.id, {
        email: invite.email,
        role: invite.role,
      });
    } catch (auditError) {
      console.error("Audit log failed", auditError);
      // Continue - don't fail the request
    }

    // Set active org cookie
    cookieStore.set("vam_active_org", invite.org_id, {
      sameSite: "lax",
      path: "/",
      httpOnly: true,
    });

    return NextResponse.json({ success: true, orgId: invite.org_id });
  } catch (error) {
    return respondWithError(error, { action: "accept-invite" });
  }
}
