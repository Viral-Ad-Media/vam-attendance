import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/context";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";
import { sendAttendanceFeedbackRequest } from "@/lib/api/student-feedback-email";

type AttendanceRecord = { id: string; org_id: string; session_id: string; student_id: string; status: "present" | "absent" | "late" };

const updateSchema = z.object({
  status: z.enum(["present", "absent", "late"]).optional(),
  notes: z.string().optional().nullable(),
});

type RouteParamsPromise = { params: Promise<{ id: string }> };

async function assertTeacherOwnsAttendance(
  db: Awaited<ReturnType<typeof getRouteContext>>["db"],
  orgId: string,
  teacherId: string,
  attendanceId: string
) {
  const { data, error } = await db
    .from("attendance")
    .select("session_id, sessions!inner(teacher_id)")
    .eq("org_id", orgId)
    .eq("id", attendanceId)
    .single<AttendanceRecord>();
  if (error) throw error;
  const sessionTeacherId = (data as unknown as { sessions: { teacher_id: string | null } }).sessions?.teacher_id;
  return sessionTeacherId === teacherId;
}

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

export async function GET(_: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { id } = await params;
    const { db, orgId, role, teacherId } = await getRouteContext();
    if (role === "teacher") {
      if (!teacherId || !(await assertTeacherOwnsAttendance(db, orgId, teacherId, id))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const { data, error } = await db
      .from("attendance")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", id)
      .single<AttendanceRecord>();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return respondWithError(error, { action: "get-attendance" });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = updateSchema.parse(body);
    const { db, session, orgId, role, teacherId } = await getRouteContext();
    if (role === "teacher") {
      if (!teacherId || !(await assertTeacherOwnsAttendance(db, orgId, teacherId, id))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const { data, error } = await db
      .from("attendance")
      .update(payload)
      .eq("org_id", orgId)
      .eq("id", id)
      .select()
      .single<AttendanceRecord>();

    if (error) throw error;
    await logAudit(db, orgId, session.user.id, "update", "attendance", id, payload);
    const feedbackEmail = await trySendFeedbackEmail(data, orgId);
    return NextResponse.json({ ...data, feedback_email: feedbackEmail });
  } catch (error) {
    return respondWithError(error, { action: "update-attendance" });
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { id } = await params;
    const { db, session, orgId, role, teacherId } = await getRouteContext();
    if (role === "teacher") {
      if (!teacherId || !(await assertTeacherOwnsAttendance(db, orgId, teacherId, id))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const { error } = await db
      .from("attendance")
      .delete()
      .eq("org_id", orgId)
      .eq("id", id);

    if (error) throw error;
    await logAudit(db, orgId, session.user.id, "delete", "attendance", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return respondWithError(error, { action: "delete-attendance" });
  }
}
