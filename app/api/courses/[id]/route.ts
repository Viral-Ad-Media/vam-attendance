import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  modality: z.enum(["group", "1on1"]).optional(),
  lead_teacher_id: z.string().uuid().optional().nullable(),
  course_type: z.string().optional().nullable(),
  duration_weeks: z.number().int().positive().optional().nullable(),
  sessions_per_week: z.number().int().positive().optional().nullable(),
  max_students: z.number().int().positive().optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
});

function handleError(error: unknown) {
  console.error("Course detail API error:", error);
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
  }
  if (error instanceof Error) {
    if (error.message === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "org_not_set") return NextResponse.json({ error: "Organization not set" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: JSON.stringify(error) || "Unexpected error" }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("courses")
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = updateSchema.parse(body);
    const { supabase, session, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("courses")
      .update(payload)
      .eq("org_id", orgId)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "update", "course", id, payload);
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, session, orgId } = await getRouteContext();
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("org_id", orgId)
      .eq("id", id);
    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "delete", "course", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
