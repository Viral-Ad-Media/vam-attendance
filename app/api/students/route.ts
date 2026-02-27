import { NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { respondWithError } from "@/lib/api/errors";

const studentSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  country: z.string().optional(),
  program: z.string().optional(),
  duration_weeks: z.number().int().nonnegative().optional(),
  sessions_per_week: z.number().int().nonnegative().optional(),
  class_name: z.string().optional(),
});

export async function GET() {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("org_id", orgId)
      .order("name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-students" });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = consumeRateLimit(`students:post:${ip}`, 30);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const payload = studentSchema.parse(body);
    const { supabase, session, orgId } = await getRouteContext();

    const { data, error } = await supabase
      .from("students")
      .insert([{ ...payload, org_id: orgId }])
      .select()
      .single();

    if (error) throw error;
    await logAudit(supabase, orgId, session.user.id, "create", "student", data.id, { email: data.email });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return respondWithError(error, { action: "create-student" });
  }
}
