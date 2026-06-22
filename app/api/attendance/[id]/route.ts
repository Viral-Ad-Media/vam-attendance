import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";
import { sendAttendanceFeedbackRequest } from "@/lib/api/student-feedback-email";

const updateSchema = z.object({
  status: z.enum(["present", "absent", "late"]).optional(),
  notes: z.string().optional(),
});

type RouteParamsPromise = { params: Promise<{ id: string }> };

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
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", id)
      .single();

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
    const { supabase, session, orgId } = await getRouteContext();

    const { data, error } = await supabase
      .from("attendance")
      .update(payload)
      .eq("org_id", orgId)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "update", "attendance", id, payload);
    const feedbackEmail = await trySendFeedbackEmail(data, orgId);
    return NextResponse.json({ ...data, feedback_email: feedbackEmail });
  } catch (error) {
    return respondWithError(error, { action: "update-attendance" });
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { id } = await params;
    const { supabase, session, orgId } = await getRouteContext();
    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("org_id", orgId)
      .eq("id", id);

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "delete", "attendance", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return respondWithError(error, { action: "delete-attendance" });
  }
}
