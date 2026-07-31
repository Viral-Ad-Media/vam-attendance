"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from "@/components/dashboard/AccountContext";
import { cn } from "@/lib/utils";
import { BookOpen, Users, GraduationCap, CalendarClock, Check, X, Rocket } from "lucide-react";

type StepKey = "course" | "teacher" | "student" | "session";

type Step = {
  key: StepKey;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STEPS: Step[] = [
  {
    key: "course",
    label: "Create a course",
    description: "Set up the program your students will attend.",
    href: "/dashboard/courses",
    icon: BookOpen,
  },
  {
    key: "teacher",
    label: "Add a teacher",
    description: "Invite an instructor to run sessions.",
    href: "/dashboard/teachers",
    icon: Users,
  },
  {
    key: "student",
    label: "Add students",
    description: "Build your roster so you can track attendance.",
    href: "/dashboard/students",
    icon: GraduationCap,
  },
  {
    key: "session",
    label: "Schedule a session",
    description: "Put a class on the calendar to start tracking.",
    href: "/dashboard/sessions",
    icon: CalendarClock,
  },
];

function storageKey(orgId: string) {
  return `vam.onboarding.dismissed.${orgId}`;
}

export function OnboardingChecklist() {
  const { accountId } = useAccount();
  const [dismissed, setDismissed] = React.useState(true); // default hidden until we know
  const [done, setDone] = React.useState<Record<StepKey, boolean> | null>(null);

  React.useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey(accountId)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [accountId]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/courses", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/teachers", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/students", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/sessions", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([courses, teachers, students, sessions]) => {
        if (cancelled) return;
        setDone({
          course: Array.isArray(courses) && courses.length > 0,
          teacher: Array.isArray(teachers) && teachers.length > 0,
          student: Array.isArray(students) && students.length > 0,
          session: Array.isArray(sessions) && sessions.length > 0,
        });
      })
      .catch(() => {
        if (!cancelled) setDone(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey(accountId), "1");
    } catch {}
  };

  if (!done || dismissed) return null;

  const completedCount = STEPS.filter((s) => done[s.key]).length;
  if (completedCount === STEPS.length) return null;

  return (
    <Card data-tour="onboarding-checklist" className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <Rocket className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">Getting started</CardTitle>
            <p className="text-xs text-slate-600">
              {completedCount} of {STEPS.length} steps done — finish setup to unlock the full picture.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss getting started checklist"
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {STEPS.map((step) => {
            const isDone = done[step.key];
            const Icon = step.icon;
            return (
              <Link
                key={step.key}
                href={step.href}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition",
                  isDone
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isDone ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isDone ? "text-emerald-800 line-through decoration-emerald-400" : "text-slate-900"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-600">{step.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
