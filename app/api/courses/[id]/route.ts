import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { reconcileCourseSessions, seedAttendanceForSessions } from "@/lib/api/course-sessions";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  modality: z.enum(["group", "1on1"]).optional(),
  lead_teacher_id: z.string().uuid().optional().nullable(),
  course_type: z.string().optional().nullable(),
  duration_weeks: z.number().int().positive().optional().nullable(),
  sessions_per_week: z.number().int().positive().optional().nullable(),
  meeting_days: z.array(z.number().int().min(0).max(6)).optional(),
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

    const { data: existingCourse, error: existingCourseError } = await supabase
      .from("courses")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", id)
      .single();
    if (existingCourseError) throw existingCourseError;

    const courseUpdate: Record<string, string | number | null> = {};
    if (payload.title !== undefined) courseUpdate.title = payload.title;
    if (payload.description !== undefined) courseUpdate.description = payload.description;
    if (payload.modality !== undefined) courseUpdate.modality = payload.modality;
    if (payload.lead_teacher_id !== undefined) courseUpdate.lead_teacher_id = payload.lead_teacher_id;
    if (payload.course_type !== undefined) courseUpdate.course_type = payload.course_type;
    if (payload.duration_weeks !== undefined) courseUpdate.duration_weeks = payload.duration_weeks;
    if (payload.meeting_days !== undefined) {
      courseUpdate.sessions_per_week = payload.meeting_days.length ? payload.meeting_days.length : null;
    } else if (payload.sessions_per_week !== undefined) {
      courseUpdate.sessions_per_week = payload.sessions_per_week;
    }
    if (payload.max_students !== undefined) courseUpdate.max_students = payload.max_students;
    if (payload.starts_at !== undefined) courseUpdate.starts_at = payload.starts_at;
    if (payload.ends_at !== undefined) courseUpdate.ends_at = payload.ends_at;

    const { data, error } =
      Object.keys(courseUpdate).length > 0
        ? await supabase
            .from("courses")
            .update(courseUpdate)
            .eq("org_id", orgId)
            .eq("id", id)
            .select()
            .single()
        : { data: existingCourse, error: null };
    if (error) throw error;

    const sessionPlan = {
      courseId: id,
      orgId,
      title: payload.title ?? existingCourse.title,
      description: payload.description !== undefined ? payload.description : existingCourse.description ?? null,
      course_type: payload.course_type !== undefined ? payload.course_type : existingCourse.course_type ?? null,
      lead_teacher_id:
        payload.lead_teacher_id !== undefined ? payload.lead_teacher_id : existingCourse.lead_teacher_id ?? null,
      duration_weeks:
        payload.duration_weeks !== undefined ? payload.duration_weeks : existingCourse.duration_weeks ?? null,
      sessions_per_week:
        payload.sessions_per_week !== undefined
          ? payload.sessions_per_week
          : payload.meeting_days !== undefined
            ? payload.meeting_days.length
              ? payload.meeting_days.length
              : null
            : existingCourse.sessions_per_week ?? null,
      meeting_days: payload.meeting_days,
      starts_at: payload.starts_at !== undefined ? payload.starts_at : existingCourse.starts_at ?? null,
    };

    const sessionSync = await reconcileCourseSessions(supabase, sessionPlan);
    if (sessionSync.createdSessionIds.length) {
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("org_id", orgId)
        .eq("course_id", id);
      if (enrollErr) throw enrollErr;
      await seedAttendanceForSessions(
        supabase,
        orgId,
        sessionSync.createdSessionIds,
        enrollments?.map((enrollment) => enrollment.student_id) ?? []
      );
    }

    await logAudit(supabase, orgId, session.user.id, "update", "course", id, {
      ...courseUpdate,
      sessions_reconciled: sessionSync,
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, session, orgId } = await getRouteContext();

    // Ensure related data is cleaned up with the course delete.
    const { error: deleteSessionsError } = await supabase
      .from("sessions")
      .delete()
      .eq("org_id", orgId)
      .eq("course_id", id);
    if (deleteSessionsError) throw deleteSessionsError;

    const { error: deleteEnrollmentsError } = await supabase
      .from("enrollments")
      .delete()
      .eq("org_id", orgId)
      .eq("course_id", id);
    if (deleteEnrollmentsError) throw deleteEnrollmentsError;

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
