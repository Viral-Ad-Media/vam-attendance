// components/dashboard/Sidebar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  BookOpen,
  Users,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavChild = { href: string; label: string };
type NavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;            // optional for sections that act only as parents
  children?: NavChild[];    // submenu entries
};

type SidebarProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
  onClose?: () => void;
};

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

  // --- expanded parent sections (new) ---
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("vam.sidebar.expanded") || "{}");
    } catch {
      return {};
    }
  });
  React.useEffect(() => {
    try { localStorage.setItem("vam.sidebar.expanded", JSON.stringify(expanded)); } catch {}
  }, [expanded]);

  const nav: NavItem[] = [
    { key: "overview", href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    {
      key: "courses",
      label: "Courses",
      icon: BookOpen,
      children: [
        { href: "/dashboard/courses", label: "Courses" },
        { href: "/dashboard/enrollments", label: "Enrollments" },
      ],
    },
    {
      key: "teachers",
      label: "Teachers",
      icon: Users,
      children: [
        { href: "/dashboard/teachers", label: "Directory" },
        { href: "/dashboard/sessions", label: "Sessions" },
      ],
    },
    {
      key: "students",
      label: "Students",
      icon: GraduationCap,
      children: [
        { href: "/dashboard/students", label: "Directory" },
        { href: "/dashboard/attendance", label: "Attendance" },
      ],
    },

    { key: "settings", href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  // Determine which parent is active (matches any child or parent href)
  const isItemActive = (item: NavItem) => {
    if (item.children?.length) {
      return item.children.some((c) => pathname.startsWith(c.href));
    }
    return item.href ? pathname === item.href : false;
  };

  // Auto-expand active parent on mount (non-collapsed mode)
  React.useEffect(() => {
    const next: Record<string, boolean> = { ...expanded };
    nav.forEach((item) => {
      if (item.children?.length) {
        if (isItemActive(item)) next[item.key] = true;
      }
    });
    setExpanded(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  const toggle = (key: string) => {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  };

  const handleNavigate = () => {
    onNavigate?.();
  };

  const containerWidth = collapsed ? "w-[70px]" : "w-[248px]";

  return (
    <aside className={cn("h-full", containerWidth, isMobile ? "" : "transition-[width] duration-200")}>
      <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 px-3 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="group flex flex-1 items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-100"
            title="VAM Attendance"
            onClick={handleNavigate}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-cyan-500 text-xs font-bold text-white shadow-sm">
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
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50",
              )}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className={cn("rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2", collapsed && "text-center")}>
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

            // Simple leaf link
            if (!item.children?.length) {
              return (
                <li key={item.key}>
                  <Link
                    href={item.href || "#"}
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition",
                      active
                        ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                    title={item.label}
                    onClick={handleNavigate}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-500")} />
                    {!collapsed && (
                      <span className="truncate font-medium">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            }

            // Parent with submenu
            const open = !!expanded[item.key];

            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => toggle(item.key)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition",
                    active
                      ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                  title={item.label}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-500")} />
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          open ? "rotate-0" : "-rotate-90",
                          active ? "text-white" : "text-slate-500"
                        )}
                      />
                    </>
                  )}
                </button>

                {/* Submenu */}
                {!collapsed && open && (
                  <ul className="mt-0.5 ml-8 space-y-0.5">
                    {item.children.map((c) => {
                      const childActive = pathname === c.href || pathname.startsWith(c.href + "/");
                      return (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition",
                              childActive
                                ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10"
                                : "text-slate-700 hover:bg-slate-100"
                            )}
                            title={c.label}
                            onClick={handleNavigate}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", childActive ? "bg-white" : "bg-slate-400")} />
                            <span className="truncate">{c.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

        <div
          className={cn(
            "mt-auto rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-3 py-3 text-[11px] text-slate-100",
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
