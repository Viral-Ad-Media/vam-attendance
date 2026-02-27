// app/dashboard/sessions/page.client.tsx
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";

type Session = {
  id: string;
  title?: string | null;
  teacher_id?: string | null;
  course_id?: string | null;
  starts_at: string;
};

type Teacher = { id: string; name: string };
type Course = { id: string; title: string; lead_teacher_id?: string | null };

type Attendance = { session_id: string; status: string };

export default function SessionsPage() {
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("list");
  const [teacherFilter, setTeacherFilter] = React.useState<string>("all");
  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [openNew, setOpenNew] = React.useState(false);
  const [newTeacher, setNewTeacher] = React.useState<string>("");
  const [newCourseId, setNewCourseId] = React.useState<string>("");
  const [newTitle, setNewTitle] = React.useState("");
  const [newStartsAt, setNewStartsAt] = React.useState("");
  const [newSaving, setNewSaving] = React.useState(false);
  const [newError, setNewError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [sRes, tRes, aRes, cRes] = await Promise.all([
          fetch("/api/sessions", { cache: "no-store" }),
          fetch("/api/teachers", { cache: "no-store" }),
          fetch("/api/attendance", { cache: "no-store" }),
          fetch("/api/courses", { cache: "no-store" }),
        ]);
        if (!sRes.ok) throw new Error(await sRes.text());
        if (!tRes.ok) throw new Error(await tRes.text());
        if (!aRes.ok) throw new Error(await aRes.text());
        if (!cRes.ok) throw new Error(await cRes.text());
        setSessions((await sRes.json()) as Session[]);
        setTeachers((await tRes.json()) as Teacher[]);
        setAttendance((await aRes.json()) as Attendance[]);
        setCourses((await cRes.json()) as Course[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tMap = React.useMemo(() => new Map(teachers.map((t) => [t.id, t.name])), [teachers]);
  const filteredSessions = React.useMemo(
    () =>
      teacherFilter === "all"
        ? sessions
        : sessions.filter((s) => s.teacher_id === teacherFilter),
    [sessions, teacherFilter]
  );
  const sessionsByDay = React.useMemo(() => {
    const map = new Map<string, Session[]>();
    filteredSessions.forEach((s) => {
      const key = new Date(s.starts_at).toDateString();
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    });
    return map;
  }, [filteredSessions]);

  const calendarDays = React.useMemo(() => {
    const monthStart = new Date(calendarMonth.year, calendarMonth.month, 1);
    const monthEnd = new Date(calendarMonth.year, calendarMonth.month + 1, 0);
    const start = new Date(monthStart);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(monthEnd);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const days: { date: Date; key: string }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({ date: new Date(d), key: new Date(d).toDateString() });
    }
    return days;
  }, [calendarMonth]);

  return (
    <div className="space-y-4">
      <TopBar title="Sessions" subtitle="All scheduled sessions" showAccountInTitle={false} />

      <Card>
        <CardHeader className="flex items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Sessions</CardTitle>
            <p className="text-xs text-slate-500">View all scheduled sessions and attendance counts.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setOpenNew(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
            <div className="w-[190px]">
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Filter by teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                className="px-3"
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
              <Button
                size="sm"
                variant={viewMode === "calendar" ? "default" : "ghost"}
                className="px-3"
                onClick={() => setViewMode("calendar")}
              >
                Calendar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          {loading && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && viewMode === "list" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Teacher</th>
                  <th className="py-2 pr-3">Starts</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Present / Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s) => {
                  const total = attendance.filter((a) => a.session_id === s.id).length;
                  const present = attendance.filter(
                    (a) => a.session_id === s.id && a.status === "present"
                  ).length;
                  const status = getSessionStatus(s.starts_at);
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="py-2 pr-3">{s.title ?? "Session"}</td>
                      <td className="py-2 pr-3">{s.teacher_id ? tMap.get(s.teacher_id) ?? "—" : "—"}</td>
                      <td className="py-2 pr-3">
                        {new Date(s.starts_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${sessionStatusStyles[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {present} / {total}
                      </td>
                    </tr>
                  );
                })}
                {!filteredSessions.length && (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={4}>
                      No sessions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {!loading && !error && viewMode === "calendar" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <button
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={() => {
                    setCalendarMonth((prev) => {
                      const m = prev.month === 0 ? 11 : prev.month - 1;
                      const y = prev.month === 0 ? prev.year - 1 : prev.year;
                      return { year: y, month: m };
                    });
                  }}
                >
                  ←
                </button>
                <span>
                  {new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={() => {
                    setCalendarMonth((prev) => {
                      const m = prev.month === 11 ? 0 : prev.month + 1;
                      const y = prev.month === 11 ? prev.year + 1 : prev.year;
                      return { year: y, month: m };
                    });
                  }}
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-slate-500">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map(({ date, key }) => {
                  const daySessions = sessionsByDay.get(key) || [];
                  const isToday = new Date().toDateString() === date.toDateString();
                  const inMonth = date.getMonth() === calendarMonth.month;
                  return (
                    <div
                      key={key}
                      className={`min-h-[110px] rounded-lg border p-2 text-xs ${
                        inMonth ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
                      } ${isToday ? "ring-1 ring-fuchsia-500" : ""}`}
                    >
                      <div className="mb-1 flex items-center justify-between text-slate-600">
                        <span className="text-[11px] font-semibold">{date.getDate()}</span>
                        {isToday && (
                          <span className="text-[10px] text-fuchsia-600 font-semibold">Today</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {daySessions.map((s) => {
                          const time = new Date(s.starts_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          const total = attendance.filter((a) => a.session_id === s.id).length;
                          const present = attendance.filter(
                            (a) => a.session_id === s.id && a.status === "present"
                          ).length;
                          const status = getSessionStatus(s.starts_at);
                          return (
                            <div
                              key={s.id}
                              className={`rounded border px-2 py-1 ${sessionSurfaceStyles[status]}`}
                            >
                              <div className="text-[11px] font-semibold text-slate-800">
                                {s.title ?? "Session"}
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-600">
                                <span>{time}</span>
                                <span
                                  className={`inline-flex items-center rounded-full px-1.5 py-[2px] text-[10px] font-semibold capitalize ${sessionStatusStyles[status]}`}
                                >
                                  {status}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-600">
                                {present}/{total} present
                              </div>
                            </div>
                          );
                        })}
                        {!daySessions.length && (
                          <div className="rounded border border-dashed border-slate-200 px-2 py-1 text-slate-400">
                            No sessions
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {openNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onMouseDown={() => setOpenNew(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border bg-white p-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Add Session</h3>
              <button
                aria-label="Close"
                className="h-8 w-8 rounded-md hover:bg-slate-100"
                onClick={() => setOpenNew(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <Select value={newTeacher || "none"} onValueChange={(v) => setNewTeacher(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={newCourseId || "none"}
                onValueChange={(v) => {
                  const resolved = v === "none" ? "" : v;
                  setNewCourseId(resolved);
                  const course = courses.find((c) => c.id === resolved);
                  if (course?.lead_teacher_id) setNewTeacher(course.lead_teacher_id);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Course (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                placeholder="Title (optional)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <input
                className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                type="datetime-local"
                value={newStartsAt}
                onChange={(e) => setNewStartsAt(e.target.value)}
              />
              {newError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {newError}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenNew(false)}>
                Cancel
              </Button>
              <Button
                disabled={newSaving || !newStartsAt}
                onClick={async () => {
                  try {
                    setNewSaving(true);
                    setNewError(null);
                    const payload: any = {
                      teacher_id: newTeacher || undefined,
                      course_id: newCourseId || undefined,
                      title: newTitle.trim() || undefined,
                      starts_at: new Date(newStartsAt).toISOString(),
                    };
                    const res = await fetch("/api/sessions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    setOpenNew(false);
                    setNewTitle("");
                    setNewTeacher("");
                    setNewStartsAt("");
                    const [sRes, aRes] = await Promise.all([
                      fetch("/api/sessions", { cache: "no-store" }),
                      fetch("/api/attendance", { cache: "no-store" }),
                    ]);
                    if (sRes.ok) setSessions((await sRes.json()) as Session[]);
                    if (aRes.ok) setAttendance((await aRes.json()) as Attendance[]);
                  } catch (err) {
                    setNewError(err instanceof Error ? err.message : "Failed to create session");
                  } finally {
                    setNewSaving(false);
                  }
                }}
              >
                {newSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SessionStatus = "upcoming" | "completed";

const getSessionStatus = (startsAt: string): SessionStatus =>
  new Date(startsAt).getTime() >= Date.now() ? "upcoming" : "completed";

const sessionStatusStyles: Record<SessionStatus, string> = {
  upcoming: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const sessionSurfaceStyles: Record<SessionStatus, string> = {
  upcoming: "border-sky-200 bg-sky-50",
  completed: "border-emerald-200 bg-emerald-50",
};
