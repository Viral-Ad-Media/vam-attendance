import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { respondWithError } from "@/lib/api/errors";
import { buildCourseSessionRows, seedAttendanceForSessions } from "@/lib/api/course-sessions";

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  modality: z.enum(["group", "1on1"]),
  lead_teacher_id: z.string().uuid().optional().nullable(),
  course_type: z.string().optional().nullable(),
  duration_weeks: z.number().int().positive().optional().nullable(),
  sessions_per_week: z.number().int().positive().optional().nullable(),
  meeting_days: z.array(z.number().int().min(0).max(6)).optional(), // 0=Sun..6=Sat
  max_students: z.number().int().positive().optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
});

export async function GET() {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("courses")
      .select("*, lead_teacher_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-courses" });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = consumeRateLimit(`courses:post:${ip}`, 30);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const payload = courseSchema.parse(body);
    const { meeting_days, ...coursePayload } = payload;
    const { supabase, session, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("courses")
      .insert([
        {
          ...coursePayload,
          sessions_per_week:
            coursePayload.sessions_per_week ?? (meeting_days?.length || undefined),
          org_id: orgId,
        },
      ])
      .select()
      .single();
    if (error) throw error;

    const sessionRows = buildCourseSessionRows({
      courseId: data.id,
      orgId,
      title: payload.title,
      description: payload.description ?? null,
      course_type: payload.course_type ?? null,
      lead_teacher_id: payload.lead_teacher_id ?? null,
      duration_weeks: coursePayload.duration_weeks ?? null,
      sessions_per_week: coursePayload.sessions_per_week ?? null,
      meeting_days,
      starts_at: payload.starts_at ?? null,
    });

    const { data: insertedSessions, error: sessionError } = await supabase.from("sessions").insert(sessionRows).select("id");
    if (sessionError) throw sessionError;
    if (insertedSessions?.length) {
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("org_id", orgId)
        .eq("course_id", data.id);
      if (enrollErr) throw enrollErr;
      await seedAttendanceForSessions(
        supabase,
        orgId,
        insertedSessions.map((session) => session.id),
        enrollments?.map((enrollment) => enrollment.student_id) ?? []
      );
    }

    await logAudit(supabase, orgId, session.user.id, "create", "course", data.id, { title: data.title });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return respondWithError(error, { action: "create-course" });
  }
}
