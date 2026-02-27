import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";

const updateSchema = z.object({
  teacher_id: z.string().uuid().optional().nullable(),
  status: z.enum(["active", "paused", "completed", "dropped"]).optional(),
});

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
  }
  if (error instanceof Error) {
    if (error.message === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "org_not_set") return NextResponse.json({ error: "Organization not set" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("enrollments")
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
      .from("enrollments")
      .update(payload)
      .eq("org_id", orgId)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "update", "enrollment", id, payload);
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
      .from("enrollments")
      .delete()
      .eq("org_id", orgId)
      .eq("id", id);
    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "delete", "enrollment", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
