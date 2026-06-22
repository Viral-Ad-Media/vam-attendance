import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase/service";
import { createHash } from "crypto";
import { ApiError, respondWithError } from "@/lib/api/errors";

const validateSchema = z.object({
  token: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = validateSchema.parse(body);
    const service = getServiceClient();

    // Search for invite by token
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

    // Fetch organization name
    const { data: org, error: orgError } = await service
      .from("organizations")
      .select("name")
      .eq("id", invite.org_id)
      .maybeSingle();

    if (orgError) throw orgError;

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      org_id: invite.org_id,
      organization: org ? { name: org.name } : undefined,
    });
  } catch (error) {
    return respondWithError(error, { action: "validate-invite" });
  }
}
