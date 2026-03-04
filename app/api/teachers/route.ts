import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { ApiError, respondWithError } from "@/lib/api/errors";
import { getServiceClient } from "@/lib/supabase/service";
import { sendTeacherSetupEmail } from "@/lib/api/teacher-setup-email";

const teacherSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  sendPasswordSetup: z.boolean().optional(),
  user_id: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("org_id", orgId)
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-teachers" });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = consumeRateLimit(`teachers:post:${ip}`, 30);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const payload = teacherSchema.parse(body);
    const { supabase, session, orgId } = await getRouteContext();
    const service = getServiceClient();

    const teacherEmail = payload.email.trim().toLowerCase();
    const teacherName = payload.name.trim();
    const providedPassword = payload.password?.trim();
    const sendPasswordSetup = payload.sendPasswordSetup ?? !providedPassword;
    if (!providedPassword && !sendPasswordSetup) {
      return NextResponse.json(
        { error: "Provide a password or send a password setup email." },
        { status: 400 }
      );
    }
    const temporaryPassword = `${crypto.randomUUID()}Aa1!`;
    const passwordForAuth = providedPassword || temporaryPassword;
    const nowIso = new Date().toISOString();

    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();
    const orgName = orgData?.name ?? null;

    // Create auth user for teacher with role + org metadata
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email: teacherEmail,
      password: passwordForAuth,
      email_confirm: true,
      app_metadata: { role: "teacher", org_id: orgId, org_name: orgName },
      user_metadata: { role: "teacher", default_org_id: orgId, org_name: orgName, full_name: teacherName },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes("already")) {
        return NextResponse.json({ error: "User already exists for this email" }, { status: 409 });
      }
      throw authError;
    }

    if (!authData.user?.id) {
      throw new ApiError("Teacher account creation failed", 500, "TEACHER_AUTH_CREATE_FAILED");
    }
    const authUserId = authData.user.id;

    // Ensure teacher can pass RLS checks as an org member.
    const { error: membershipError } = await service.from("memberships").upsert(
      [
        {
          org_id: orgId,
          user_id: authUserId,
          role: "teacher",
          invited_by: session.user.id,
          invited_at: nowIso,
          accepted_at: providedPassword ? nowIso : null,
        },
      ],
      { onConflict: "org_id,user_id" }
    );
    if (membershipError) {
      await service.auth.admin.deleteUser(authUserId);
      throw membershipError;
    }

    // Keep the app users table in sync for profile lookups.
    const { error: userProfileError } = await service.from("users").upsert(
      [
        {
          id: authUserId,
          org_id: orgId,
          email: teacherEmail,
          full_name: teacherName,
          created_at: nowIso,
        },
      ],
      { onConflict: "id" }
    );
    if (userProfileError) {
      await service.auth.admin.deleteUser(authUserId);
      throw userProfileError;
    }

    const { password, sendPasswordSetup: sendSetupFlag, ...teacherFields } = payload;
    void password;
    void sendSetupFlag;

    const { data, error } = await supabase
      .from("teachers")
      .insert([
        {
          ...teacherFields,
          name: teacherName,
          email: teacherEmail,
          user_id: authUserId,
          org_id: orgId,
        },
      ])
      .select()
      .single();

    if (error) {
      await service.auth.admin.deleteUser(authUserId);
      throw error;
    }

    let setupEmailSent = false;
    if (sendPasswordSetup) {
      try {
        await sendTeacherSetupEmail({
          service,
          teacherEmail,
          teacherName,
          organizationName: orgName,
        });
        setupEmailSent = true;
      } catch (setupError) {
        console.error("Teacher password setup email failed", setupError);
      }
    }

    await logAudit(supabase, orgId, session.user.id, "create", "teacher", data.id, {
      email: data.email,
      user_id: authUserId,
      setup_email_sent: setupEmailSent,
    });
    return NextResponse.json({ ...data, setup_email_sent: setupEmailSent }, { status: 201 });
  } catch (error) {
    return respondWithError(error, { action: "create-teacher" });
  }
}
