import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";

const bulkSchema = z.object({
  records: z.array(
    z.object({
      student_id: z.string().uuid(),
      status: z.enum(["present", "absent", "late"]),
      notes: z.string().max(1000).optional().nullable(),
    })
  ).min(1).max(500),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, orgId } = await getRouteContext();

    const [sessionRes, enrollmentsRes, attendanceRes] = await Promise.all([
      supabase.from("sessions").select("*").eq("org_id", orgId).eq("id", id).single(),
      supabase
        .from("enrollments")
        .select("student_id, students(id, name, email, program, class_name)")
        .eq("org_id", orgId)
        .in("status", ["active"]),
      supabase
        .from("attendance")
        .select("student_id, status, notes")
        .eq("org_id", orgId)
        .eq("session_id", id),
    ]);

    if (sessionRes.error) throw sessionRes.error;
    if (enrollmentsRes.error) throw enrollmentsRes.error;
    if (attendanceRes.error) throw attendanceRes.error;

    const session = sessionRes.data;
    const courseId = session.course_id;

    // Filter enrollments to those matching this session's course (if any)
    const enrollments = (enrollmentsRes.data ?? []) as unknown as Array<{
      student_id: string;
      students: { id: string; name: string; email: string; program: string; class_name: string } | null;
    }>;

    let relevantStudents = enrollments;
    if (courseId) {
      const { data: courseEnrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("org_id", orgId)
        .eq("course_id", courseId)
        .in("status", ["active"]);
      const courseStudentIds = new Set((courseEnrollments ?? []).map((e) => e.student_id));
      relevantStudents = enrollments.filter((e) => courseStudentIds.has(e.student_id));
    }

    // De-duplicate students
    const seen = new Set<string>();
    const students = relevantStudents
      .filter((e) => e.students && !seen.has(e.student_id) && seen.add(e.student_id))
      .map((e) => e.students!);

    const attendanceMap = Object.fromEntries(
      (attendanceRes.data ?? []).map((a) => [a.student_id, { status: a.status, notes: a.notes }])
    );

    return NextResponse.json({ session, students, attendanceMap });
  } catch (error) {
    return respondWithError(error, { action: "get-session-attendance-bulk" });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { records } = bulkSchema.parse(body);
    const { supabase, session: authSession, orgId } = await getRouteContext();

    // Verify session belongs to org
    const { error: sessErr } = await supabase
      .from("sessions")
      .select("id")
      .eq("org_id", orgId)
      .eq("id", id)
      .single();
    if (sessErr) throw sessErr;

    const rows = records.map((r) => ({
      org_id: orgId,
      session_id: id,
      student_id: r.student_id,
      status: r.status,
      notes: r.notes ?? null,
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "org_id,session_id,student_id" });

    if (error) throw error;

    await logAudit(supabase, orgId, authSession.user.id, "update", "attendance", id, {
      bulk: true,
      count: rows.length,
    });

    return NextResponse.json({ saved: rows.length });
  } catch (error) {
    return respondWithError(error, { action: "bulk-save-session-attendance" });
  }
}
