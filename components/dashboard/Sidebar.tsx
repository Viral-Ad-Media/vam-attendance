// components/dashboard/Sidebar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  BookOpen,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MessageSquareText,
  CalendarClock,
  UserPlus,
  Activity,
  Send,
  Mail,
  Database,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { SimpleTooltip } from "@/components/ui/tooltip";

type NavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

type SidebarProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
  onClose?: () => void;
};

const nav: NavItem[] = [
  { key: "overview", href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { key: "students", href: "/dashboard/students", label: "Students", icon: GraduationCap },
  { key: "attendance", href: "/dashboard/attendance", label: "Attendance", icon: ClipboardCheck },
  { key: "feedback", href: "/dashboard/feedback", label: "Feedback", icon: MessageSquareText },
  { key: "sessions", href: "/dashboard/sessions", label: "Sessions", icon: CalendarClock },
  { key: "courses", href: "/dashboard/courses", label: "Courses", icon: BookOpen },
  { key: "enrollments", href: "/dashboard/enrollments", label: "Enrollments", icon: UserPlus },
  { key: "reports", href: "/dashboard/reports", label: "Reports", icon: LineChart },
  { key: "audit", href: "/dashboard/audit", label: "Audit logs", icon: Activity },
  { key: "feedback-requests", href: "/dashboard/feedback-requests", label: "Feedback requests", icon: Send },
  { key: "invites", href: "/dashboard/invites", label: "Invites", icon: Mail },
  { key: "import-export", href: "/dashboard/import-export", label: "Import/Export", icon: Database },
  { key: "settings", href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ variant = "desktop", onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";

  // --- collapsed state (existing) ---
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (isMobile || typeof window === "undefined") return false;
    try { return localStorage.getItem("vam.sidebar.collapsed") === "1"; } catch { return false; }
  });
  React.useEffect(() => {
    if (isMobile) return;
    try { localStorage.setItem("vam.sidebar.collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed, isMobile]);
  React.useEffect(() => {
    if (isMobile) setCollapsed(false);
  }, [isMobile]);

  const isItemActive = React.useCallback(
    (item: NavItem) =>
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === item.href || pathname.startsWith(item.href + "/"),
    [pathname]
  );

  const handleNavigate = () => {
    onNavigate?.();
  };

  const containerWidth = collapsed ? "w-[72px]" : "w-[252px]";

  return (
    <aside className={cn("h-full", containerWidth, isMobile ? "" : "transition-[width] duration-200")}>
      <div className="flex h-full flex-col gap-4 bg-white px-3 py-4">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="group flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-100"
            title="VAM Attendance"
            onClick={handleNavigate}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white shadow-sm">
              VAM
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 leading-tight">Attendance</div>
                <div className="text-[11px] font-medium text-slate-500 leading-tight">
                  Dashboard
                </div>
              </div>
            )}
          </Link>
          {!isMobile && (
            <SimpleTooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100",
                )}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </SimpleTooltip>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className={cn("rounded-lg border border-slate-200 bg-slate-50 px-3 py-2", collapsed && "text-center")}>
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
            {!collapsed && <span>Status</span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-[3px] text-[11px] font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          {!collapsed && <p className="mt-1 text-[11px] text-slate-500">Org-wide visibility enabled</p>}
        </div>

        <nav className={cn("flex-1 overflow-y-auto pr-1", collapsed ? "px-0" : "px-0.5")}>
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            const link = (
              <Link
                href={item.href}
                data-tour={isMobile ? undefined : `nav-${item.key}`}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                )}
                onClick={handleNavigate}
              >
                <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-500")} />
                {!collapsed && (
                  <span className="truncate font-medium">{item.label}</span>
                )}
              </Link>
            );

            return (
              <li key={item.key}>
                {collapsed ? (
                  <SimpleTooltip label={item.label} side="right">
                    {link}
                  </SimpleTooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

        {!collapsed && (
          <div className="mb-2">
            <CommandPalette tourAnchor={!isMobile} />
          </div>
        )}

        <div
          className={cn(
            "mt-auto rounded-lg border border-slate-800 bg-slate-950 px-3 py-3 text-[11px] text-slate-100",
            collapsed && "px-2 text-center"
          )}
        >
          {!collapsed ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[12px] font-semibold">
                <span>VAM v1.0</span>
                <LineChart className="h-4 w-4 text-slate-200" />
              </div>
              <p className="text-[11px] text-slate-200/80">
                Track sessions, attendance, and teams with real-time updates.
              </p>
            </div>
          ) : (
            <span className="font-semibold">v1.0</span>
          )}
        </div>
      </div>
    </aside>
  );
}
