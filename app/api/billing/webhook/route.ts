import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDatabase } from "@/lib/db/service";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function missingConfig() {
  return NextResponse.json(
    { error: "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET." },
    { status: 501 }
  );
}

async function upsertSubscriptionRecord(stripeSub: Stripe.Subscription, orgId: string) {
  const db = getAdminDatabase();
  const price = stripeSub.items.data[0]?.price;
  await db
    .from("subscriptions")
    .upsert(
      {
        org_id: orgId,
        status: stripeSub.status,
        plan: price?.nickname || price?.id || "unknown",
        seats: stripeSub.items.data[0]?.quantity || 1,
        trial_ends_at: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
        current_period_end: stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000).toISOString()
          : null,
        stripe_subscription_id: stripeSub.id,
        stripe_price_id: price?.id || null,
      },
      { onConflict: "org_id" }
    );
}

export async function POST(request: NextRequest) {
  if (!stripeSecret || !webhookSecret) return missingConfig();

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = (subscription.metadata as Record<string, string | undefined>)?.org_id;
        if (orgId) {
          await upsertSubscriptionRecord(subscription, orgId);
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = (session.metadata as Record<string, string | undefined>)?.org_id;
        if (orgId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
          await upsertSubscriptionRecord(subscription, orgId);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handling failed";
    console.error("Stripe webhook error", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
