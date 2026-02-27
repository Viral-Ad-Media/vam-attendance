import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { respondWithError } from "@/lib/api/errors";

const enrollmentSchema = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid(),
  teacher_id: z.string().uuid().optional().nullable(),
  status: z.enum(["active", "paused", "completed", "dropped"]).optional(),
});

const enrollmentBatchSchema = z.array(enrollmentSchema).min(1).max(200);

export async function GET(request: Request) {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const courseId = searchParams.get("course_id");
    const teacherId = searchParams.get("teacher_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("enrollments")
      .select("*, student_id, course_id, teacher_id")
      .eq("org_id", orgId)
      .order("enrolled_at", { ascending: false });

    if (studentId) query = query.eq("student_id", studentId);
    if (courseId) query = query.eq("course_id", courseId);
    if (teacherId) query = query.eq("teacher_id", teacherId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-enrollments" });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = consumeRateLimit(`enrollments:post:${ip}`, 60);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const payloads = Array.isArray(body) ? enrollmentBatchSchema.parse(body) : [enrollmentSchema.parse(body)];
    const { supabase, session, orgId } = await getRouteContext();
    const rows = payloads.map((payload) => ({ ...payload, org_id: orgId }));

    const { data, error } = await supabase
      .from("enrollments")
      .upsert(rows, { onConflict: "org_id,student_id,course_id" })
      .select();
    if (error) throw error;

    await logAudit(supabase, orgId, session.user.id, "create", "enrollment", data?.[0]?.id, {
      count: rows.length,
      student_ids: rows.map((r) => r.student_id),
      course_ids: rows.map((r) => r.course_id),
    });

    if (rows.length === 1) {
      return NextResponse.json(data?.[0] ?? null, { status: 201 });
    }
    return NextResponse.json(data ?? [], { status: 201 });
  } catch (error) {
    return respondWithError(error, { action: "create-enrollment" });
  }
}
