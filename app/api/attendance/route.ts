import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext, requireSessionAccess } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { respondWithError } from "@/lib/api/errors";
import { sendAttendanceFeedbackRequest } from "@/lib/api/student-feedback-email";

const attendanceSchema = z.object({
  session_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: z.enum(["present", "absent", "late"]),
  notes: z.string().optional(),
});

async function trySendFeedbackEmail(attendance: {
  id: string;
  org_id?: string | null;
  session_id: string;
  student_id: string;
  status: "present" | "absent" | "late";
}, orgId: string) {
  try {
    return await sendAttendanceFeedbackRequest({ attendance, orgId });
  } catch (error) {
    console.error("[attendance-feedback-email] Failed to send feedback link", error);
    return {
      sent: false,
      reason: "send_failed",
      message: error instanceof Error ? error.message : "Failed to send feedback email",
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, orgId, role, teacherId } = await getRouteContext();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    const studentId = searchParams.get("student_id");

    // Teachers only ever see attendance for their own sessions, never the whole org's.
    if (role === "teacher") {
      if (!teacherId) return NextResponse.json([]);

      let ownSessionsQuery = supabase.from("sessions").select("id").eq("org_id", orgId).eq("teacher_id", teacherId);
      if (sessionId) ownSessionsQuery = ownSessionsQuery.eq("id", sessionId);
      const { data: ownSessions, error: ownSessionsError } = await ownSessionsQuery;
      if (ownSessionsError) throw ownSessionsError;

      const ownSessionIds = (ownSessions ?? []).map((s) => s.id as string);
      if (ownSessionIds.length === 0) return NextResponse.json([]);

      let query = supabase
        .from("attendance")
        .select("*")
        .eq("org_id", orgId)
        .in("session_id", ownSessionIds)
        .order("noted_at", { ascending: false });
      if (studentId) query = query.eq("student_id", studentId);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    let query = supabase
      .from("attendance")
      .select("*")
      .eq("org_id", orgId)
      .order("noted_at", { ascending: false });

    if (sessionId) query = query.eq("session_id", sessionId);
    if (studentId) query = query.eq("student_id", studentId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-attendance" });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = consumeRateLimit(`attendance:post:${ip}`, 60);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const payload = attendanceSchema.parse(body);
    const context = await getRouteContext();
    await requireSessionAccess(context, payload.session_id, true);
    const { supabase, session, orgId } = context;

    const { data, error } = await supabase
      .from("attendance")
      .insert([{ ...payload, org_id: orgId }])
      .select()
      .single();

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "create", "attendance", data.id, {
      session_id: data.session_id,
      student_id: data.student_id,
      status: data.status,
    });
    const feedbackEmail = await trySendFeedbackEmail(data, orgId);
    return NextResponse.json({ ...data, feedback_email: feedbackEmail }, { status: 201 });
  } catch (error) {
    return respondWithError(error, { action: "create-attendance" });
  }
}
