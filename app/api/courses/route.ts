import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { respondWithError } from "@/lib/api/errors";

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  modality: z.enum(["group", "1on1"]),
  lead_teacher_id: z.string().uuid().optional().nullable(),
  course_type: z.string().optional(),
  duration_weeks: z.number().int().positive().optional(),
  sessions_per_week: z.number().int().positive().optional(),
  meeting_days: z.array(z.number().int().min(0).max(6)).optional(), // 0=Sun..6=Sat
  max_students: z.number().int().positive().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
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

    // Auto-create sessions using meeting days (or evenly spaced fallback)
    let startDate = new Date(payload.starts_at ?? new Date().toISOString());
    if (Number.isNaN(startDate.getTime())) startDate = new Date();

    const meetingDays = meeting_days && meeting_days.length ? [...meeting_days].sort() : null;
    const sessionsPerWeek =
      (meetingDays?.length || 0) ||
      (coursePayload.sessions_per_week && coursePayload.sessions_per_week > 0
        ? coursePayload.sessions_per_week
        : 1);
    const totalWeeks =
      coursePayload.duration_weeks && coursePayload.duration_weeks > 0
        ? coursePayload.duration_weeks
        : 1;
    const totalSessions = Math.max(1, sessionsPerWeek * totalWeeks);
    const maxSessions = Math.min(totalSessions, 200); // safety cap

    const buildTimestampForDay = (dayNumber: number, weekOffset: number) => {
      const base = new Date(startDate);
      const dayDiff = (dayNumber - base.getDay() + 7) % 7 + weekOffset * 7;
      base.setDate(base.getDate() + dayDiff);
      return base.toISOString();
    };

    const sessionRows =
      meetingDays && meetingDays.length
        ? Array.from({ length: totalWeeks }).flatMap((_, weekIdx) =>
            meetingDays.map((d, i) => {
              const ts = buildTimestampForDay(d, weekIdx);
              const idx = weekIdx * meetingDays.length + i;
              const ordinal = totalSessions > 1 ? ` • Session ${idx + 1}` : "";
              return {
                org_id: orgId,
                course_id: data.id,
                teacher_id: payload.lead_teacher_id ?? null,
                title: payload.title ? `${payload.title}${ordinal}` : `Session ${idx + 1}`,
                starts_at: ts,
                class_name: payload.course_type ?? null,
                description: payload.description ?? null,
              };
            })
          )
        : Array.from({ length: maxSessions }).map((_, idx) => {
            const intervalMs = (7 / sessionsPerWeek) * 24 * 60 * 60 * 1000;
            const ts = new Date(startDate.getTime() + idx * intervalMs).toISOString();
            const ordinal = maxSessions > 1 ? ` • Session ${idx + 1}` : "";
            return {
              org_id: orgId,
              course_id: data.id,
              teacher_id: payload.lead_teacher_id ?? null,
              title: payload.title ? `${payload.title}${ordinal}` : `Session ${idx + 1}`,
              starts_at: ts,
              class_name: payload.course_type ?? null,
              description: payload.description ?? null,
            };
          });

    const { data: insertedSessions, error: sessionError } = await supabase
      .from("sessions")
      .insert(sessionRows)
      .select("id");
    if (sessionError) throw sessionError;
    if (sessionRows.length && insertedSessions) {
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("org_id", orgId)
        .eq("course_id", data.id);
      if (enrollErr) throw enrollErr;
      if (enrollments?.length) {
        const attendanceSeed = insertedSessions.flatMap((sess) =>
          enrollments.map((en) => ({
            org_id: orgId,
            session_id: sess.id,
            student_id: en.student_id,
            status: "absent" as const,
          }))
        );
        if (attendanceSeed.length) {
          await supabase.from("attendance").upsert(attendanceSeed, {
            onConflict: "org_id,session_id,student_id",
          });
        }
      }
    }

    await logAudit(supabase, orgId, session.user.id, "create", "course", data.id, { title: data.title });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return respondWithError(error, { action: "create-course" });
  }
}
