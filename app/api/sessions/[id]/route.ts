import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";

const updateSchema = z.object({
  teacher_id: z.string().uuid().optional().nullable(),
  course_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).optional().nullable(),
  starts_at: z.string().min(1).optional(),
  ends_at: z.string().optional(),
  class_name: z.string().optional(),
  description: z.string().optional(),
});

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
    const { supabase, orgId, role, teacherId } = await getRouteContext();
    if (role === "teacher" && !teacherId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let query = supabase.from("sessions").select("*").eq("org_id", orgId).eq("id", id);
    if (role === "teacher" && teacherId) {
      query = query.eq("teacher_id", teacherId);
    }
    const { data, error } = await query.single();

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
    const { supabase, session, orgId, role, teacherId } = await getRouteContext();
    if (role === "teacher" && !teacherId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let query = supabase.from("sessions").update(payload).eq("org_id", orgId).eq("id", id);
    if (role === "teacher" && teacherId) {
      query = query.eq("teacher_id", teacherId);
    }
    const { data, error } = await query.select().single();

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "update", "session", id, payload);
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, session, orgId, role, teacherId } = await getRouteContext();
    if (role === "teacher" && !teacherId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let query = supabase.from("sessions").delete().eq("org_id", orgId).eq("id", id);
    if (role === "teacher" && teacherId) {
      query = query.eq("teacher_id", teacherId);
    }
    const { error } = await query;

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "delete", "session", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
