import { NextRequest, NextResponse } from "next/server";
import { getRouteContext } from "@/lib/api/supabase";
import { respondWithError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { searchParams } = new URL(request.url);
    const threshold = Number(searchParams.get("threshold") ?? "75");

    const [studentsRes, attendanceRes] = await Promise.all([
      supabase.from("students").select("id, name, email, program, class_name").eq("org_id", orgId),
      supabase.from("attendance").select("student_id, status").eq("org_id", orgId),
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (attendanceRes.error) throw attendanceRes.error;

    const students = studentsRes.data ?? [];
    const attendance = attendanceRes.data ?? [];

    // Build per-student stats
    const statsMap = new Map<string, { total: number; present: number }>();
    attendance.forEach((a) => {
      const s = statsMap.get(a.student_id) ?? { total: 0, present: 0 };
      s.total += 1;
      if (a.status === "present") s.present += 1;
      statsMap.set(a.student_id, s);
    });

    const atRisk = students
      .map((student) => {
        const stat = statsMap.get(student.id);
        if (!stat || stat.total === 0) return null;
        const rate = Math.round((stat.present / stat.total) * 100);
        if (rate >= threshold) return null;
        return { ...student, attendanceRate: rate, totalSessions: stat.total, presentCount: stat.present };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.attendanceRate) - (b!.attendanceRate));

    return NextResponse.json(atRisk);
  } catch (error) {
    return respondWithError(error, { action: "get-at-risk-students" });
  }
}
