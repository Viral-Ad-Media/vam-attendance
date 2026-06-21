import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";

const profileUpdateSchema = z.object({
  full_name: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  avatar_url: z.string().trim().url().optional().nullable(),
});

function readMetadataString(input: unknown, key: string) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

export async function GET() {
  try {
    const { supabase, session, orgId } = await getRouteContext();
    const [profileResult, orgResult, membershipResult] = await Promise.all([
      supabase
        .from("users")
        .select("id, org_id, email, full_name, phone, location, bio, avatar_url, created_at, updated_at")
        .eq("org_id", orgId)
        .eq("id", session.user.id)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("id, name, owner_id, created_at")
        .eq("id", orgId)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", session.user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (orgResult.error) throw orgResult.error;
    if (membershipResult.error) throw membershipResult.error;

    const authEmail = session.user.email ?? "";
    const fallbackName =
      readMetadataString(session.user.user_metadata, "full_name") ||
      readMetadataString(session.user.user_metadata, "name") ||
      authEmail;
    const organization = orgResult.data;
    const profile =
      profileResult.data ?? {
        id: session.user.id,
        org_id: orgId,
        email: authEmail,
        full_name: fallbackName,
        phone: null,
        location: null,
        bio: null,
        avatar_url: null,
        created_at: session.user.created_at,
        updated_at: null,
      };
    const role =
      membershipResult.data?.role ??
      (organization?.owner_id === session.user.id ? "owner" : "member");

    return NextResponse.json({
      profile,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            created_at: organization.created_at,
          }
        : null,
      role,
    });
  } catch (error) {
    return respondWithError(error, { action: "get-account-profile" });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = profileUpdateSchema.parse(body);
    const { supabase, session, orgId } = await getRouteContext();

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No profile updates provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("org_id", orgId)
      .eq("id", session.user.id)
      .select("id, org_id, email, full_name, phone, location, bio, avatar_url, created_at, updated_at")
      .single();

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "update", "user", session.user.id, payload);
    return NextResponse.json(data);
  } catch (error) {
    return respondWithError(error, { action: "update-account-profile" });
  }
}
