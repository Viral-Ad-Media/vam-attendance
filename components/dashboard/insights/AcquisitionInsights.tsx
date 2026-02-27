/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Row } from "@/app/types/dashboard";
import { cn } from "@/lib/utils";

type DimKey = "placement" | "platform" | "device" | "country" | "age";

type Insight = {
  dim: DimKey;
  bestByLeads?: { label: string; value: number };
  bestByPurchases?: { label: string; value: number };
};

function k(v: number | null | undefined) {
  if (!v || v === 0) return "0";
  if (v < 1000) return String(Math.round(v));
  if (v < 1000000) return `${(v / 1000).toFixed(1)}k`;
  return `${(v / 1000000).toFixed(1)}m`;
}

function topN(
  rows: Row[],
  dim: DimKey,
  metric: "leads" | "purchases",
): { label: string; value: number } | undefined {
  const m = new Map<string, number>();
  for (const r of rows) {
    const label = String((r as any)[dim] ?? "").trim();
    if (!label) continue;
    const v = Number((r as any)[metric] ?? 0);
    if (!v) continue;
    m.set(label, (m.get(label) || 0) + v);
  }
  let best: string | null = null;
  let bestVal = 0;
  m.forEach((val, key) => {
    if (val > bestVal) { bestVal = val; best = key; }
  });
  if (!best) return undefined;
  return { label: best, value: bestVal };
}

function Pill({
  title,
  stat,
  subtle = false,
}: {
  title: string;
  stat?: { label: string; value: number };
  subtle?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 min-w-[160px] max-w-full",
        subtle ? "bg-white/60" : "bg-white/90"
      )}
    >
      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
      {stat ? (
        <div className="mt-1 flex items-baseline gap-1">
          <div className="truncate text-slate-700" title={stat.label}>
            {stat.label}
          </div>
          <div className="ml-auto text-sm font-semibold text-slate-900 tabular-nums">
            {k(stat.value)}
          </div>
        </div>
      ) : (
        <div className="mt-1 text-slate-400 text-sm">—</div>
      )}
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const label =
    insight.dim === "placement" ? "PLACEMENT" :
    insight.dim === "platform"  ? "PLATFORM"  :
    insight.dim === "device"    ? "DEVICE"    :
    insight.dim === "country"   ? "COUNTRY"   :
    "AGE";

  return (
    <div className="space-y-2">
      <div className="text-[11px] tracking-wide text-slate-500 font-semibold">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill title="By Leads" stat={insight.bestByLeads} />
        <Pill title="By Purchases" stat={insight.bestByPurchases} subtle />
      </div>
    </div>
  );
}

function computeInsights(rows: Row[]): Insight[] {
  const dims: DimKey[] = ["placement", "platform", "device", "country", "age"];
  return dims.map((d) => ({
    dim: d,
    bestByLeads: topN(rows, d, "leads"),
    bestByPurchases: topN(rows, d, "purchases"),
  }));
}

export function AcquisitionInsights({
  rows,
  loading = false,
}: {
  rows: Row[];
  loading?: boolean;
}) {
  const insights = React.useMemo(
    () => (loading ? [] : computeInsights(rows)),
    [rows, loading]
  );

  return (
    <Card className="rounded-2xl border-2 border-white/50 bg-white/85 backdrop-blur">
      <CardHeader className="pb-1">
        <CardTitle className="text-base font-semibold text-slate-800">
          Acquisition Insights <span className="text-slate-500 text-sm">(last selection)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 bg-slate-200/70 rounded" />
                <div className="flex gap-2">
                  <div className="h-14 w-40 bg-slate-200/70 rounded-xl" />
                  <div className="h-14 w-40 bg-slate-200/70 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {insights.map((ins) => (
              <InsightRow key={ins.dim} insight={ins} />
            ))}
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="mt-4 text-sm text-slate-500">
            No rows for this selection. Try changing date range, channel, or account.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
