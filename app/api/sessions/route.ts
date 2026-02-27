import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { respondWithError } from "@/lib/api/errors";

const sessionSchema = z.object({
  teacher_id: z.string().uuid().optional().nullable(),
  course_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).optional().nullable(),
  starts_at: z.string().min(1),
  ends_at: z.string().optional(),
  class_name: z.string().optional(),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("org_id", orgId)
      .order("starts_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-sessions" });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = consumeRateLimit(`sessions:post:${ip}`, 30);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const payload = sessionSchema.parse(body);
    const { supabase, session, orgId } = await getRouteContext();

    const { data, error } = await supabase
      .from("sessions")
      .insert([{ ...payload, org_id: orgId }])
      .select()
      .single();

    if (error) throw error;

    // Seed attendance placeholders for enrolled students in the same course
    if (payload.course_id) {
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("org_id", orgId)
        .eq("course_id", payload.course_id);
      if (enrollErr) throw enrollErr;
      if (enrollments && enrollments.length) {
        const rows = enrollments.map((en) => ({
          org_id: orgId,
          session_id: data.id,
          student_id: en.student_id,
          status: "absent" as const,
        }));
        await supabase.from("attendance").upsert(rows, { onConflict: "org_id,session_id,student_id" });
      }
    }

    await logAudit(supabase, orgId, session.user.id, "create", "session", data.id, { title: data.title });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return respondWithError(error, { action: "create-session" });
  }
}
