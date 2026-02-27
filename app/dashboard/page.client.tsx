// app/dashboard/page.client.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle, Loader } from "lucide-react";
import { useDashboardData } from "@/lib/hooks/useDashboardData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const { stats, sessions } = useDashboardData();

  const healthLabel =
    stats.avgAttendanceRate >= 90
      ? "Excellent"
      : stats.avgAttendanceRate >= 80
        ? "Stable"
        : "Needs attention";
  const healthBadge =
    stats.avgAttendanceRate >= 90
      ? "bg-emerald-100 text-emerald-800"
      : stats.avgAttendanceRate >= 80
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";

  const statPills = [
    { label: "Students", value: stats.totalStudents, meta: `${stats.totalEnrollments} enrollments` },
    { label: "Courses", value: stats.totalCourses, meta: `${stats.weekSessions} sessions this week` },
    { label: "Live sessions", value: stats.activeSessions, meta: "Active right now" },
  ];

  const upcomingSessions = React.useMemo(
    () =>
      sessions
        .slice()
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .filter((s) => new Date(s.starts_at).getTime() >= Date.now()),
    [sessions]
  );
  const nextSession = upcomingSessions[0];

  return (
    <div className="w-full space-y-5">
      <TopBar subtitle="Overview" title="Dashboard Overview" />

      {stats.loading && (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-4 py-6 shadow-sm">
          <Loader className="mr-2 h-5 w-5 animate-spin text-fuchsia-600" />
          <p className="text-sm text-slate-600">Loading dashboard data…</p>
        </div>
      )}

      {stats.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-semibold">Error:</span> {stats.error}
        </div>
      )}

      {!stats.loading && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[200px]">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Attendance health</p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-4xl font-semibold leading-none">
                      {stats.avgAttendanceRate}%
                    </span>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", healthBadge)}>
                      {healthLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">
                    Keep engagement high by monitoring sessions and following up on absences.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild className="bg-white text-slate-900 hover:bg-white/90">
                      <Link href="/dashboard/attendance">Mark attendance</Link>
                    </Button>
                    <Button asChild variant="outline" className="border-slate-200 bg-white/10 text-white hover:bg-white/15">
                      <Link href="/dashboard/sessions">Schedule session</Link>
                    </Button>
                  </div>
                </div>
                <div className="grid w-full min-w-[220px] max-w-[360px] grid-cols-1 gap-3 sm:grid-cols-3">
                  {statPills.map((pill) => (
                    <div key={pill.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[12px] text-slate-200/80">{pill.label}</p>
                      <p className="text-2xl font-semibold text-white">{pill.value}</p>
                      <p className="text-[11px] text-slate-200/70">{pill.meta}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 right-8 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Next up</CardTitle>
                <p className="text-xs text-slate-500">Closest scheduled session</p>
              </CardHeader>
              <CardContent>
                {nextSession ? (
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-sm font-semibold text-slate-900">{nextSession.title || "Session"}</p>
                    <p className="text-xs text-slate-600">
                      {new Date(nextSession.starts_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {nextSession.class_name && (
                      <p className="text-xs text-slate-600">Class: {nextSession.class_name}</p>
                    )}
                    <Link
                      href="/dashboard/sessions"
                      className="inline-flex items-center text-xs font-semibold text-fuchsia-700 hover:underline"
                    >
                      View calendar →
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-600">
                    No sessions on the calendar yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-800">Upcoming sessions</CardTitle>
                  <p className="text-xs text-slate-500">What’s planned next</p>
                </div>
                <Link href="/dashboard/sessions" className="text-xs font-semibold text-fuchsia-700 hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length ? (
                  <div className="space-y-3">
                    {upcomingSessions.slice(0, 6).map((session) => {
                      const startTime = new Date(session.starts_at);
                      const timeStr = startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const dateStr = startTime.toLocaleDateString([], { month: "short", day: "numeric" });
                      const isToday = new Date().toDateString() === startTime.toDateString();
                      return (
                        <div
                          key={session.id}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm hover:border-fuchsia-200 hover:bg-fuchsia-50/40"
                        >
                          <div className="mt-1 h-10 w-10 rounded-lg bg-slate-100 text-center text-[11px] font-semibold text-slate-700 leading-tight flex flex-col items-center justify-center">
                            <span>{dateStr}</span>
                            <span className="text-[10px] text-slate-500">{timeStr}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                              {session.title || "Session"}
                            </p>
                            <p className="text-xs text-slate-600">
                              {session.class_name ? session.class_name + " • " : ""}
                              {timeStr}
                            </p>
                            {session.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1">{session.description}</p>
                            )}
                          </div>
                          <span className={cn(
                            "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            isToday ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                          )}>
                            {isToday ? "Today" : "Scheduled"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
                    <Calendar className="mb-2 h-8 w-8 text-slate-300" />
                    No sessions scheduled yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Quick actions</CardTitle>
                <p className="text-xs text-slate-500">Move faster with shortcuts</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full justify-center bg-slate-900 text-white hover:bg-slate-800">
                  <Link href="/dashboard/attendance">Mark attendance</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-center border-slate-200">
                  <Link href="/dashboard/sessions">Create session</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-center border-slate-200">
                  <Link href="/dashboard/students">Manage students</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-center border-slate-200">
                  <Link href="/dashboard/courses">Manage courses</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Signals</CardTitle>
                <p className="text-xs text-slate-500">Health and alerts</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {nextSession && (
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-slate-600" />
                    <div className="text-sm text-slate-800">
                      <div className="font-semibold text-slate-900">Next session</div>
                      <div className="text-xs text-slate-600">
                        {nextSession.title || "Session"} •{" "}
                        {new Date(nextSession.starts_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {stats.avgAttendanceRate < 80 && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div className="text-sm text-amber-900">
                      <div className="font-semibold">Attendance alert</div>
                      <div className="text-xs text-amber-800">
                        Average attendance is {stats.avgAttendanceRate}%, below 80%.
                      </div>
                    </div>
                  </div>
                )}
                {stats.totalStudents === 0 && sessions.length === 0 && (
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-slate-600" />
                    <div className="text-sm text-slate-800">
                      <div className="font-semibold">Getting started</div>
                      <div className="text-xs text-slate-600">
                        Create your first session and add students to begin tracking.
                      </div>
                    </div>
                  </div>
                )}
                {sessions.length > 0 && (
                  <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div className="text-sm text-blue-900">
                      <div className="font-semibold">Week overview</div>
                      <div className="text-xs text-blue-800">
                        {stats.weekSessions} sessions scheduled for this week.
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-1 xl:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Roster summary</CardTitle>
                <p className="text-xs text-slate-500">Students and programs</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Students</p>
                    <p className="text-xs text-slate-600">Active in the workspace</p>
                  </div>
                  <span className="text-xl font-bold text-slate-900">{stats.totalStudents}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Courses</p>
                    <p className="text-xs text-slate-600">Structured learning paths</p>
                  </div>
                  <span className="text-xl font-bold text-slate-900">{stats.totalCourses}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Enrollments</p>
                    <p className="text-xs text-slate-600">Across all programs</p>
                  </div>
                  <span className="text-xl font-bold text-slate-900">{stats.totalEnrollments}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 xl:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800">Actions in focus</CardTitle>
                <p className="text-xs text-slate-500">Quick follow-ups</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  Encourage teachers to log attendance daily to keep the health score green.
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  Share session links with students ahead of time to reduce late arrivals.
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  Audit enrollment data weekly to keep rosters in sync.
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
