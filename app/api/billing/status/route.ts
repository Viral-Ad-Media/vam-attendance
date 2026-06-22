import { NextResponse } from "next/server";
import { getRouteContext } from "@/lib/api/supabase";

export async function GET() {
  try {
    const { supabase, orgId } = await getRouteContext();
    const [orgResult, subscriptionResult] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, stripe_customer_id")
        .eq("id", orgId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("id, status, plan, seats, trial_ends_at, current_period_end, stripe_subscription_id")
        .eq("org_id", orgId)
        .maybeSingle(),
    ]);

    if (orgResult.error) throw orgResult.error;
    if (subscriptionResult.error) throw subscriptionResult.error;

    return NextResponse.json({
      organization: orgResult.data,
      subscription: subscriptionResult.data ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load billing status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
