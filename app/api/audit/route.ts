import { NextResponse } from "next/server";
import { getRouteContext } from "@/lib/api/supabase";
import { respondWithError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const { supabase, orgId } = await getRouteContext();
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const entity = url.searchParams.get("entity");
    const actorId = url.searchParams.get("actor_id");
    const limit = Number(url.searchParams.get("limit") ?? 200);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 20), 500));

    if (action) query = query.eq("action", action);
    if (entity) query = query.eq("entity", entity);
    if (actorId) query = query.eq("actor_id", actorId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-audit-logs" });
  }
}
