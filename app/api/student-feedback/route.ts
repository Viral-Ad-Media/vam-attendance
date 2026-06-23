import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { respondWithError } from "@/lib/api/errors";

const feedbackSchema = z.object({
  student_id: z.string().uuid(),
  attendance_id: z.string().uuid().optional().nullable(),
  teacher_id: z.string().uuid().optional().nullable(),
  course_id: z.string().uuid().optional().nullable(),
  session_id: z.string().uuid().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  category: z.enum(["general", "progress", "participation", "behavior", "homework", "assessment"]).default("general"),
  sentiment: z.enum(["positive", "neutral", "needs_attention"]).default("neutral"),
  visibility: z.enum(["internal", "shareable"]).default("internal"),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
  reviewed_at: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const teacherId = searchParams.get("teacher_id");
    const courseId = searchParams.get("course_id");
    const sessionId = searchParams.get("session_id");
    const sentiment = searchParams.get("sentiment");
    const category = searchParams.get("category");

    let query = supabase
      .from("student_feedback")
      .select("*")
      .eq("org_id", orgId)
      .order("reviewed_at", { ascending: false });

    if (studentId) query = query.eq("student_id", studentId);
    if (teacherId) query = query.eq("teacher_id", teacherId);
    if (courseId) query = query.eq("course_id", courseId);
    if (sessionId) query = query.eq("session_id", sessionId);
    if (sentiment) query = query.eq("sentiment", sentiment);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-student-feedback" });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = consumeRateLimit(`student-feedback:post:${ip}`, 60);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const payload = feedbackSchema.parse(body);
    const { supabase, session, orgId } = await getRouteContext();

    const { data, error } = await supabase
      .from("student_feedback")
      .insert([
        {
          ...payload,
          reviewed_at: payload.reviewed_at || new Date().toISOString(),
          org_id: orgId,
          created_by: session.user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "create", "student_feedback", data.id, {
      attendance_id: data.attendance_id,
      student_id: data.student_id,
      teacher_id: data.teacher_id,
      rating: data.rating,
      sentiment: data.sentiment,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return respondWithError(error, { action: "create-student-feedback" });
  }
}
