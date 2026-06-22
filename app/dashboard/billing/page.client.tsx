"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CreditCard, Loader2, ShieldCheck, Sparkles } from "lucide-react";

type BillingStatus = {
  organization: {
    id: string;
    name?: string | null;
    stripe_customer_id?: string | null;
  };
  subscription?: {
    id: string;
    status: string;
    plan: string;
    seats: number;
    trial_ends_at?: string | null;
    current_period_end?: string | null;
    stripe_subscription_id?: string | null;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function readResponseError(response: Response, fallback: string) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return text || fallback;
  }
}

export default function BillingPageClient() {
  const [status, setStatus] = React.useState<BillingStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const loadStatus = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readResponseError(response, "Failed to load billing status"));
      }
      setStatus((await response.json()) as BillingStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing status");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const performAction = async (endpoint: string, successMessage: string) => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      const response = await fetch(endpoint, { method: "POST" });
      if (!response.ok) {
        throw new Error(await readResponseError(response, "Billing action failed"));
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setActionMessage(successMessage);
      await loadStatus();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Billing action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const activePlan = status?.subscription?.plan ?? "Free";
  const currentStatus = status?.subscription?.status ?? "inactive";
  const hasStripeCustomer = Boolean(status?.organization?.stripe_customer_id);

  return (
    <div className="space-y-4">
      <TopBar title="Billing" subtitle="Manage your organization subscription" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>Organization billing overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading billing status...
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                <AlertTriangle className="mr-2 inline-block h-4 w-4" /> {error}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[.18em] text-slate-500">Plan</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{activePlan}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full text-slate-700">
                    {currentStatus}
                  </Badge>
                </div>

                <div className="grid gap-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Status</span>
                    <span className="font-medium text-slate-900">{currentStatus}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Seats</span>
                    <span className="font-medium text-slate-900">{status?.subscription?.seats ?? 1}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Renewal</span>
                    <span className="font-medium text-slate-900">
                      {status?.subscription?.current_period_end ? formatDate(status.subscription.current_period_end) : "Not scheduled"}
                    </span>
                  </div>
                  {status?.subscription?.trial_ends_at && (
                    <div className="flex items-center justify-between gap-3">
                      <span>Trial ends</span>
                      <span className="font-medium text-slate-900">{formatDate(status.subscription.trial_ends_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Billing actions</CardTitle>
            <CardDescription>Subscribe or manage payment settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Update payment method</p>
                    <p className="mt-1 text-sm text-slate-500">Open Stripe billing portal to manage your card.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={() => performAction("/api/billing/portal", "Opening billing portal...")}
                    disabled={actionLoading || loading || !hasStripeCustomer}
                  >
                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Manage billing
                  </Button>
                </div>
                {!hasStripeCustomer && (
                  <p className="mt-3 text-sm text-slate-500">A customer record is created after your first checkout.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Subscribe</p>
                    <p className="mt-1 text-sm text-slate-500">Start your paid plan and unlock team features.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={() => performAction("/api/billing/checkout", "Redirecting to checkout...")}
                    disabled={actionLoading || loading}
                  >
                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Subscribe now
                  </Button>
                </div>
              </div>
            </div>

            {actionMessage && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {actionMessage}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Billing notes</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Your subscription and payment information is managed through Stripe.</li>
                <li>Use the portal to update cards, view invoices, or cancel your plan.</li>
                <li>If you have questions, contact support from your team dashboard.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
