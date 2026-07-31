"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/settings", label: "General" },
  { href: "/dashboard/teachers", label: "Team" },
  { href: "/dashboard/billing", label: "Billing" },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-slate-200 pb-2" aria-label="Settings sections">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              active ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
