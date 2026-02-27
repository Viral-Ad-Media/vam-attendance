import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getRouteContext } from "@/lib/api/supabase";
import { getServiceClient } from "@/lib/supabase/service";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { logError } from "@/lib/telemetry";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;

function missingConfig() {
  return NextResponse.json(
    { error: "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID." },
    { status: 501 }
  );
}

export async function POST(request: Request) {
  if (!stripeSecret || !priceId) return missingConfig();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Service role key not configured." }, { status: 501 });
  }

  let orgId: string | null = null;
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = consumeRateLimit(`billing:checkout:${ip}`, 10);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) } }
      );
    }

    const { session, orgId: activeOrgId } = await getRouteContext();
    orgId = activeOrgId;
    const supabaseService = getServiceClient();
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    const { data: orgRow, error: orgError } = await supabaseService
      .from("organizations")
      .select("stripe_customer_id, name")
      .eq("id", activeOrgId)
      .single();
    if (orgError) throw orgError;

    let customerId = orgRow?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        name: orgRow?.name ?? undefined,
        metadata: { org_id: activeOrgId },
      });
      customerId = customer.id;
      await supabaseService.from("organizations").update({ stripe_customer_id: customerId }).eq("id", activeOrgId);
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancel`,
      metadata: { org_id: activeOrgId, user_id: session.user.id },
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    logError("stripe_checkout", error, { orgId: orgId ?? "unknown" });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
