import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseSessionPlan = {
  courseId: string;
  orgId: string;
  title: string;
  description?: string | null;
  course_type?: string | null;
  lead_teacher_id?: string | null;
  duration_weeks?: number | null;
  sessions_per_week?: number | null;
  meeting_days?: number[] | null;
  starts_at?: string | null;
};

export type CourseSessionRow = {
  org_id: string;
  course_id: string;
  teacher_id: string | null;
  title: string;
  starts_at: string;
  class_name: string | null;
  description: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AUTO_SESSIONS = 200;

export function normalizeMeetingDays(meetingDays?: number[] | null) {
  if (!meetingDays?.length) return null;
  return Array.from(new Set(meetingDays)).sort((left, right) => left - right);
}

function resolveStartDate(startsAt?: string | null) {
  const parsed = new Date(startsAt || new Date().toISOString());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function resolveDurationWeeks(durationWeeks?: number | null) {
  return durationWeeks && durationWeeks > 0 ? durationWeeks : 1;
}

function resolveSessionsPerWeek(plan: CourseSessionPlan, meetingDays: number[] | null) {
  if (meetingDays?.length) return meetingDays.length;
  return plan.sessions_per_week && plan.sessions_per_week > 0 ? plan.sessions_per_week : 1;
}

function buildTimestampForDay(startDate: Date, dayNumber: number, weekOffset: number) {
  const base = new Date(startDate);
  const dayDiff = (dayNumber - base.getDay() + 7) % 7 + weekOffset * 7;
  base.setDate(base.getDate() + dayDiff);
  return base.toISOString();
}

export function buildCourseSessionRows(plan: CourseSessionPlan): CourseSessionRow[] {
  const meetingDays = normalizeMeetingDays(plan.meeting_days);
  const startDate = resolveStartDate(plan.starts_at);
  const durationWeeks = resolveDurationWeeks(plan.duration_weeks);
  const sessionsPerWeek = resolveSessionsPerWeek(plan, meetingDays);
  const totalSessions = Math.max(1, sessionsPerWeek * durationWeeks);
  const className = plan.course_type ?? null;
  const description = plan.description ?? null;
  const teacherId = plan.lead_teacher_id ?? null;

  if (meetingDays?.length) {
    const rows: CourseSessionRow[] = [];
    for (let weekIdx = 0; weekIdx < durationWeeks && rows.length < MAX_AUTO_SESSIONS; weekIdx += 1) {
      for (let dayIdx = 0; dayIdx < meetingDays.length && rows.length < MAX_AUTO_SESSIONS; dayIdx += 1) {
        const sessionIndex = weekIdx * meetingDays.length + dayIdx;
        const ordinal = totalSessions > 1 ? ` • Session ${sessionIndex + 1}` : "";
        rows.push({
          org_id: plan.orgId,
          course_id: plan.courseId,
          teacher_id: teacherId,
          title: plan.title ? `${plan.title}${ordinal}` : `Session ${sessionIndex + 1}`,
          starts_at: buildTimestampForDay(startDate, meetingDays[dayIdx], weekIdx),
          class_name: className,
          description,
        });
      }
    }
    return rows;
  }

  return Array.from({ length: Math.min(totalSessions, MAX_AUTO_SESSIONS) }).map((_, index) => {
    const intervalMs = (7 / sessionsPerWeek) * DAY_MS;
    const startsAt = new Date(startDate.getTime() + index * intervalMs).toISOString();
    const ordinal = totalSessions > 1 ? ` • Session ${index + 1}` : "";
    return {
      org_id: plan.orgId,
      course_id: plan.courseId,
      teacher_id: teacherId,
      title: plan.title ? `${plan.title}${ordinal}` : `Session ${index + 1}`,
      starts_at: startsAt,
      class_name: className,
      description,
    };
  });
}

export async function seedAttendanceForSessions(
  supabase: SupabaseClient,
  orgId: string,
  sessionIds: string[],
  studentIds: string[]
) {
  const uniqueSessionIds = Array.from(new Set(sessionIds));
  const uniqueStudentIds = Array.from(new Set(studentIds));
  if (!uniqueSessionIds.length || !uniqueStudentIds.length) {
    return { seeded: 0 };
  }

  const rows = uniqueSessionIds.flatMap((sessionId) =>
    uniqueStudentIds.map((studentId) => ({
      org_id: orgId,
      session_id: sessionId,
      student_id: studentId,
      status: "absent" as const,
    }))
  );

  const { error } = await supabase.from("attendance").upsert(rows, {
    onConflict: "org_id,session_id,student_id",
    ignoreDuplicates: true,
  });
  if (error) throw error;
  return { seeded: rows.length };
}

export async function reconcileCourseSessions(
  supabase: SupabaseClient,
  plan: CourseSessionPlan
) {
  const { data: existingSessions, error: existingError } = await supabase
    .from("sessions")
    .select("id")
    .eq("org_id", plan.orgId)
    .eq("course_id", plan.courseId)
    .order("starts_at", { ascending: true });
  if (existingError) throw existingError;

  const desiredRows = buildCourseSessionRows(plan);
  const existing = existingSessions ?? [];
  const sharedCount = Math.min(existing.length, desiredRows.length);
  const updatedSessionIds: string[] = [];
  const createdSessionIds: string[] = [];
  const deletedSessionIds = existing.slice(desiredRows.length).map((session) => session.id);

  for (let index = 0; index < sharedCount; index += 1) {
    const desired = desiredRows[index];
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        teacher_id: desired.teacher_id,
        title: desired.title,
        class_name: desired.class_name,
        description: desired.description,
      })
      .eq("org_id", plan.orgId)
      .eq("id", existing[index].id);

    if (updateError) throw updateError;
    updatedSessionIds.push(existing[index].id);
  }

  if (desiredRows.length > existing.length) {
    const rowsToInsert = desiredRows.slice(existing.length);
    const { data: insertedSessions, error: insertError } = await supabase
      .from("sessions")
      .insert(rowsToInsert)
      .select("id");
    if (insertError) throw insertError;
    createdSessionIds.push(...(insertedSessions?.map((session) => session.id) ?? []));
  }

  if (deletedSessionIds.length) {
    const { error: deleteError } = await supabase
      .from("sessions")
      .delete()
      .eq("org_id", plan.orgId)
      .eq("course_id", plan.courseId)
      .in("id", deletedSessionIds);
    if (deleteError) throw deleteError;
  }

  return {
    desiredCount: desiredRows.length,
    existingCount: existing.length,
    updatedSessionIds,
    createdSessionIds,
    deletedSessionIds,
  };
}
