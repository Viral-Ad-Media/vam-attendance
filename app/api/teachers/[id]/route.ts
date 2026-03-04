import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { getServiceClient } from "@/lib/supabase/service";
import { sendTeacherSetupEmail } from "@/lib/api/teacher-setup-email";
import { ApiError } from "@/lib/api/errors";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  user_id: z.string().uuid().optional(),
  sendPasswordSetup: z.boolean().optional(),
});

function getSetupEmailErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "TEACHER_SETUP_EMAIL_NOT_CONFIGURED") {
      return "Email provider is not configured. Set RESEND_API_KEY and TEACHER_SETUP_EMAIL_FROM.";
    }
    if (error.code === "TEACHER_SETUP_LINK_GENERATION_FAILED") {
      return "Could not generate the teacher setup link.";
    }
    if (error.code === "TEACHER_SETUP_EMAIL_SEND_FAILED") {
      return "Email provider rejected the message. Check sender domain and API key.";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unknown setup email error.";
}

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
  }
  if (error instanceof Error) {
    if (error.message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "org_not_set") {
      return NextResponse.json({ error: "Organization not set on user" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = updateSchema.parse(body);
    const { supabase, session, orgId } = await getRouteContext();
    const service = getServiceClient();

    const { sendPasswordSetup, ...teacherUpdates } = payload;
    const normalizedUpdates = {
      ...teacherUpdates,
      name: teacherUpdates.name?.trim(),
      email: teacherUpdates.email?.trim().toLowerCase(),
    };

    const { data, error } = await supabase
      .from("teachers")
      .update(normalizedUpdates)
      .eq("org_id", orgId)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (data.user_id) {
      const authUpdate: { email?: string } = {};
      if (normalizedUpdates.email) authUpdate.email = normalizedUpdates.email;

      if (Object.keys(authUpdate).length) {
        const { error: authUpdateError } = await service.auth.admin.updateUserById(data.user_id, authUpdate);
        if (authUpdateError) throw authUpdateError;
      }

      if (normalizedUpdates.email || normalizedUpdates.name) {
        const userProfilePatch = {
          ...(normalizedUpdates.email ? { email: normalizedUpdates.email } : {}),
          ...(normalizedUpdates.name ? { full_name: normalizedUpdates.name } : {}),
        };
        if (Object.keys(userProfilePatch).length) {
          const { error: profileUpdateError } = await service
            .from("users")
            .update(userProfilePatch)
            .eq("id", data.user_id)
            .eq("org_id", orgId);
          if (profileUpdateError) throw profileUpdateError;
        }
      }
    }

    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();
    const orgName = orgData?.name ?? null;

    let setupEmailSent = false;
    let setupEmailError: string | null = null;
    if (sendPasswordSetup) {
      try {
        await sendTeacherSetupEmail({
          service,
          teacherEmail: data.email,
          teacherName: data.name,
          organizationName: orgName,
        });
        setupEmailSent = true;
      } catch (setupError) {
        console.error("Teacher password setup email failed", setupError);
        setupEmailError = getSetupEmailErrorMessage(setupError);
      }
    }

    await logAudit(supabase, orgId, session.user.id, "update", "teacher", id, {
      ...normalizedUpdates,
      setup_email_sent: setupEmailSent,
      setup_email_error: setupEmailError,
    });
    return NextResponse.json({
      ...data,
      setup_email_sent: setupEmailSent,
      setup_email_error: setupEmailError,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, session, orgId } = await getRouteContext();
    const service = getServiceClient();

    const { data: teacherRow, error: teacherLookupError } = await supabase
      .from("teachers")
      .select("id, user_id")
      .eq("org_id", orgId)
      .eq("id", id)
      .single();
    if (teacherLookupError) throw teacherLookupError;

    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("org_id", orgId)
      .eq("id", id);

    if (error) throw error;

    if (teacherRow.user_id) {
      const { error: profileDeleteError } = await service
        .from("users")
        .delete()
        .eq("id", teacherRow.user_id)
        .eq("org_id", orgId);
      if (profileDeleteError) throw profileDeleteError;

      const { error: membershipDeleteError } = await service
        .from("memberships")
        .delete()
        .eq("org_id", orgId)
        .eq("user_id", teacherRow.user_id);
      if (membershipDeleteError) throw membershipDeleteError;

      const { error: authDeleteError } = await service.auth.admin.deleteUser(teacherRow.user_id);
      if (authDeleteError) throw authDeleteError;
    }

    await logAudit(supabase, orgId, session.user.id, "delete", "teacher", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
