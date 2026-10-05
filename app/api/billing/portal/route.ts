import { NextResponse } from "next/server";
import Stripe from "stripe";
import { respondWithError } from "@/lib/api/errors";
import { getRouteContext, requireOrgAdmin } from "@/lib/api/supabase";
import { getServiceClient } from "@/lib/supabase/service";
import { consumeRateLimit } from "@/lib/api/rate-limit";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

function missingConfig() {
  return NextResponse.json(
    { error: "Stripe is not configured. Set STRIPE_SECRET_KEY." },
    { status: 501 }
  );
}

export async function POST(request: Request) {
  if (!stripeSecret) return missingConfig();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Service role key not configured." }, { status: 501 });
  }

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = consumeRateLimit(`billing:portal:${ip}`, 20);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) } }
      );
    }

    const { session, orgId, role } = await getRouteContext();
    requireOrgAdmin(role);
    const supabaseService = getServiceClient();
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    const { data: orgRow, error: orgError } = await supabaseService
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", orgId)
      .single();
    if (orgError) throw orgError;

    if (!orgRow?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found for org" }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const portal = await stripe.billingPortal.sessions.create({
      customer: orgRow.stripe_customer_id,
      return_url: `${origin}/dashboard?portal=return`,
    });

    return NextResponse.json({ url: portal.url, created_by: session.user.id });
  } catch (error) {
    console.error("Stripe portal error", error);
    return respondWithError(error, { action: "billing" });
  }
}
