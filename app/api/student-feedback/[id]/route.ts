import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";

const updateSchema = z.object({
  student_id: z.string().uuid().optional(),
  teacher_id: z.string().uuid().optional().nullable(),
  course_id: z.string().uuid().optional().nullable(),
  session_id: z.string().uuid().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  category: z.enum(["general", "progress", "participation", "behavior", "homework", "assessment"]).optional(),
  sentiment: z.enum(["positive", "neutral", "needs_attention"]).optional(),
  visibility: z.enum(["internal", "shareable"]).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().min(1).max(4000).optional(),
  reviewed_at: z.string().optional().nullable(),
});

type RouteParamsPromise = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { id } = await params;
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("student_feedback")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return respondWithError(error, { action: "get-student-feedback" });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = updateSchema.parse(body);
    const { supabase, session, orgId } = await getRouteContext();

    const { data, error } = await supabase
      .from("student_feedback")
      .update(payload)
      .eq("org_id", orgId)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "update", "student_feedback", id, payload);
    return NextResponse.json(data);
  } catch (error) {
    return respondWithError(error, { action: "update-student-feedback" });
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParamsPromise) {
  try {
    const { id } = await params;
    const { supabase, session, orgId } = await getRouteContext();
    const { error } = await supabase
      .from("student_feedback")
      .delete()
      .eq("org_id", orgId)
      .eq("id", id);

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "delete", "student_feedback", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return respondWithError(error, { action: "delete-student-feedback" });
  }
}
