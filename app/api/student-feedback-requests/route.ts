import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/context";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";
import { sendAttendanceFeedbackRequest } from "@/lib/api/student-feedback-email";

type AttendanceRecord = { id: string; org_id: string; session_id: string; student_id: string; status: "present" | "absent" | "late" };

const requestSchema = z.object({
  attendance_id: z.string().uuid(),
});

export async function GET() {
  try {
    const { db, orgId } = await getRouteContext();
    const { data, error } = await db
      .from("student_feedback_requests")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-feedback-requests" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = requestSchema.parse(body);
    const { db, orgId, session } = await getRouteContext();

    const { data: attendance, error: attendanceError } = await db
      .from("attendance")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", payload.attendance_id)
      .single<AttendanceRecord>();
    if (attendanceError) throw attendanceError;
    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const result = await sendAttendanceFeedbackRequest({ attendance, orgId });
    await logAudit(db, orgId, session.user.id, "create", "student_feedback_request", attendance.id, {
      attendance_id: attendance.id,
      status: attendance.status,
      feedback_sent: result.sent,
      reason: result.reason,
    });

    return NextResponse.json(result, { status: result.sent ? 201 : 200 });
  } catch (error) {
    return respondWithError(error, { action: "create-feedback-request" });
  }
}
