import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";
import { resendAttendanceFeedbackRequest } from "@/lib/api/student-feedback-email";

const actionSchema = z.object({
  action: z.enum(["resend"]),
});

type RouteParamsPromise = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = actionSchema.parse(body);
    const { supabase, orgId, session } = await getRouteContext();

    const { data: requestRow, error: requestError } = await supabase
      .from("student_feedback_requests")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", id)
      .single();
    if (requestError) throw requestError;
    if (!requestRow) {
      return NextResponse.json({ error: "Feedback request not found" }, { status: 404 });
    }

    const result = await resendAttendanceFeedbackRequest(id, orgId);
    await logAudit(supabase, orgId, session.user.id, "resend", "student_feedback_request", id, {
      request_id: id,
      feedback_sent: result.sent,
      reason: result.reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    return respondWithError(error, { action: "resend-feedback-request" });
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { id } = await params;
    const { supabase, orgId, session } = await getRouteContext();
    const { error } = await supabase
      .from("student_feedback_requests")
      .delete()
      .eq("org_id", orgId)
      .eq("id", id);
    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "delete", "student_feedback_request", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return respondWithError(error, { action: "delete-feedback-request" });
  }
}
