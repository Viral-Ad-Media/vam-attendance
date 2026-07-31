"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
  /** Render inside a <tr><td colSpan> for table empty rows. */
  colSpan?: number;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
  colSpan,
}: EmptyStateProps) {
  const body = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-slate-600">{description}</p>
      </div>
      {actionLabel && actionHref && (
        <Button size="sm" asChild className="mt-1">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan} className="py-2">
          {body}
        </td>
      </tr>
    );
  }

  return body;
}
