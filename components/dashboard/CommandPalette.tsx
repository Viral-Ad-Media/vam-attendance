"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
  LineChart, ClipboardCheck, Settings, ShieldCheck, FileText,
  Search, ArrowRight,
} from "lucide-react";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  keywords?: string[];
};

const STATIC_COMMANDS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", description: "Overview and stats", icon: LayoutDashboard, href: "/dashboard", keywords: ["home", "overview"] },
  { id: "students", label: "Students", description: "Manage student directory", icon: GraduationCap, href: "/dashboard/students", keywords: ["roster"] },
  { id: "teachers", label: "Teachers", description: "Manage teacher directory", icon: Users, href: "/dashboard/teachers", keywords: [] },
  { id: "courses", label: "Courses", description: "Manage courses", icon: BookOpen, href: "/dashboard/courses", keywords: ["class"] },
  { id: "sessions", label: "Sessions", description: "View and schedule sessions", icon: Calendar, href: "/dashboard/sessions", keywords: ["schedule"] },
  { id: "attendance", label: "Attendance", description: "Mark and review attendance", icon: ClipboardCheck, href: "/dashboard/attendance", keywords: ["mark", "present", "absent"] },
  { id: "enrollments", label: "Enrollments", description: "Manage enrollments", icon: FileText, href: "/dashboard/enrollments", keywords: [] },
  { id: "reports", label: "Reports", description: "Analytics and trends", icon: LineChart, href: "/dashboard/reports", keywords: ["analytics", "charts"] },
  { id: "audit", label: "Audit logs", description: "Track changes and actions", icon: ShieldCheck, href: "/dashboard/audit", keywords: ["logs", "history"] },
  { id: "settings", label: "Settings", description: "Preferences and security", icon: Settings, href: "/dashboard/settings", keywords: ["preferences"] },
];

function score(item: CommandItem, query: string): number {
  const q = query.toLowerCase();
  if (!q) return 1;
  const label = item.label.toLowerCase();
  const desc = (item.description ?? "").toLowerCase();
  const keys = (item.keywords ?? []).join(" ").toLowerCase();
  if (label.startsWith(q)) return 3;
  if (label.includes(q)) return 2;
  if (desc.includes(q) || keys.includes(q)) return 1;
  return 0;
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = React.useMemo(() => {
    return STATIC_COMMANDS
      .map((item) => ({ item, s: score(item, query) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ item }) => item);
  }, [query]);

  React.useEffect(() => { setActiveIndex(0); }, [filtered]);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) navigate(item.href);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      {/* Trigger shown in sidebar footer area via keyboard shortcut; also a small hint button */}
      <Dialog.Trigger asChild>
        <button
          className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition w-full"
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Quick search…</span>
          <kbd className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">⌘K</kbd>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl focus:outline-none"
          onKeyDown={onKeyDown}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages and actions…"
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">ESC</kbd>
          </div>

          <div className="max-h-[360px] overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No results for "{query}"</div>
            ) : (
              <ul>
                {filtered.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === activeIndex;
                  return (
                    <li key={item.id}>
                      <button
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                          active ? "bg-primary text-white" : "text-slate-800 hover:bg-slate-50"
                        }`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigate(item.href)}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${active ? "text-white" : "text-slate-900"}`}>
                            {item.label}
                          </p>
                          {item.description && (
                            <p className={`text-xs truncate ${active ? "text-white/80" : "text-slate-500"}`}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        <ArrowRight className={`h-3.5 w-3.5 flex-shrink-0 ${active ? "text-white/70" : "text-slate-300"}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 flex items-center gap-4">
            <span><kbd className="mr-1 font-semibold">↑↓</kbd>navigate</span>
            <span><kbd className="mr-1 font-semibold">↵</kbd>open</span>
            <span><kbd className="mr-1 font-semibold">ESC</kbd>close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
