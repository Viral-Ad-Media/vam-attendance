import { NextResponse } from "next/server";
import { getRouteContext } from "@/lib/api/supabase";
import { respondWithError } from "@/lib/api/errors";

export async function GET() {
  try {
    const { supabase, orgId } = await getRouteContext();
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return respondWithError(error, { action: "list-memberships" });
  }
}
