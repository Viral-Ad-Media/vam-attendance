import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";
import { sendAttendanceFeedbackRequest } from "@/lib/api/student-feedback-email";

const requestSchema = z.object({
  attendance_id: z.string().uuid(),
});

export async function GET() {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
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
    const { supabase, orgId, session } = await getRouteContext();

    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", payload.attendance_id)
      .single();
    if (attendanceError) throw attendanceError;
    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const result = await sendAttendanceFeedbackRequest({ attendance, orgId });
    await logAudit(supabase, orgId, session.user.id, "create", "student_feedback_request", attendance.id, {
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
