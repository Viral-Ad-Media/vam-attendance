"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Accent = "sky" | "emerald" | "amber";

type CreationDialogStat = {
  label: string;
  value: string;
  hint?: string;
};

type CreationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  stats?: CreationDialogStat[];
  accent?: Accent;
  className?: string;
};

const accentStyles: Record<
  Accent,
  {
    header: string;
    icon: string;
    chip: string;
  }
> = {
  sky: {
    header:
      "bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_42%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.96))]",
    icon: "bg-sky-500 text-white shadow-[0_14px_30px_-16px_rgba(14,165,233,0.85)]",
    chip: "border-sky-200 bg-sky-50 text-sky-700",
  },
  emerald: {
    header:
      "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_42%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.96))]",
    icon: "bg-emerald-500 text-white shadow-[0_14px_30px_-16px_rgba(16,185,129,0.85)]",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  amber: {
    header:
      "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.2),transparent_42%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.96))]",
    icon: "bg-amber-500 text-white shadow-[0_14px_30px_-16px_rgba(245,158,11,0.9)]",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export function CreationDialog({
  open,
  onOpenChange,
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  footer,
  stats = [],
  accent = "sky",
  className,
}: CreationDialogProps) {
  const accentStyle = accentStyles[accent];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[92vh] overflow-hidden p-0 sm:max-w-3xl", className)}>
        <div className="grid max-h-[92vh] grid-rows-[auto_1fr_auto]">
          <div className={cn("border-b border-slate-200/80 px-6 py-6", accentStyle.header)}>
            <DialogHeader className="mb-0 space-y-0 text-left">
              <div className="flex items-start gap-4 pr-8">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                    accentStyle.icon
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {eyebrow}
                  </p>
                  <DialogTitle className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {stats.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{stat.value}</p>
                    {stat.hint ? <p className="mt-1 text-xs text-slate-500">{stat.hint}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-y-auto px-6 py-5">{children}</div>

          <DialogFooter className="border-t border-slate-200/80 bg-slate-50/90 px-6 py-4">
            {footer}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreationSection({
  title,
  description,
  eyebrow,
  badge,
  className,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  badge?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-slate-200 bg-slate-50/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{title}</h3>
          {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
        </div>
        {badge ? (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function CreationChip({
  children,
  accent = "sky",
  className,
}: {
  children: React.ReactNode;
  accent?: Accent;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        accentStyles[accent].chip,
        className
      )}
    >
      {children}
    </span>
  );
}
