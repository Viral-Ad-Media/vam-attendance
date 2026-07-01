import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRouteContext } from "@/lib/api/supabase";
import { logAudit } from "@/lib/api/audit";
import { respondWithError } from "@/lib/api/errors";

const rowSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(80).optional().nullable().or(z.literal("")),
  country: z.string().max(100).optional().nullable().or(z.literal("")),
  program: z.string().max(200).optional().nullable().or(z.literal("")),
  class_name: z.string().max(200).optional().nullable().or(z.literal("")),
});

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuote) { inQuote = true; continue; }
      if (ch === '"' && inQuote) { inQuote = false; continue; }
      if (ch === "," && !inQuote) { values.push(current); current = ""; continue; }
      current += ch;
    }
    values.push(current);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? "").trim(); });
    return obj;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { csv: string };
    if (!body.csv || typeof body.csv !== "string") {
      return NextResponse.json({ error: "csv field required" }, { status: 400 });
    }

    const rows = parseCSV(body.csv);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No data rows found in CSV" }, { status: 400 });
    }
    if (rows.length > 1000) {
      return NextResponse.json({ error: "CSV exceeds 1000 row limit" }, { status: 400 });
    }

    const { supabase, session, orgId } = await getRouteContext();

    const valid: Array<{
      org_id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      country?: string | null;
      program?: string | null;
      class_name?: string | null;
    }> = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const parse = rowSchema.safeParse(rows[i]);
      if (!parse.success) {
        errors.push({ row: i + 2, error: parse.error.issues[0].message });
        continue;
      }
      const d = parse.data;
      valid.push({
        org_id: orgId,
        name: d.name,
        email: d.email || null,
        phone: d.phone || null,
        country: d.country || null,
        program: d.program || null,
        class_name: d.class_name || null,
      });
    }

    if (valid.length === 0) {
      return NextResponse.json({ error: "No valid rows to import", errors }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("students")
      .insert(valid)
      .select("id");

    if (error) throw error;

    await logAudit(supabase, orgId, session.user.id, "create", "student", undefined, {
      import: true,
      count: valid.length,
    });

    return NextResponse.json({ imported: data?.length ?? valid.length, errors });
  } catch (error) {
    return respondWithError(error, { action: "import-students" });
  }
}
