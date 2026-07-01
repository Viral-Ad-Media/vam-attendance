"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Save, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Textarea from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";

type Status = "present" | "absent" | "late";

interface Student {
  id: string;
  name: string;
  email: string;
  program: string;
  class_name: string;
}

interface SessionData {
  id: string;
  title: string;
  starts_at: string;
  course_id: string | null;
  teacher_id: string | null;
}

interface AttendanceRecord {
  status: Status;
  notes: string | null;
}

interface Row {
  student: Student;
  status: Status;
  notes: string;
  dirty: boolean;
}

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string; ring: string }> = {
  present: { label: "Present", bg: "bg-emerald-500", text: "text-white", ring: "ring-emerald-500" },
  late: { label: "Late", bg: "bg-amber-400", text: "text-white", ring: "ring-amber-400" },
  absent: { label: "Absent", bg: "bg-red-500", text: "text-white", ring: "ring-red-500" },
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function readError(res: Response, fallback: string) {
  const text = await res.text();
  try { return (JSON.parse(text) as { error?: string }).error || fallback; } catch { return fallback; }
}

export default function SessionAttendanceClient({ sessionId }: { sessionId: string }) {
  const { toast } = useToast();
  const [session, setSession] = React.useState<SessionData | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance-bulk`, { cache: "no-store" });
      if (!res.ok) throw new Error(await readError(res, "Failed to load session"));
      const data = (await res.json()) as {
        session: SessionData;
        students: Student[];
        attendanceMap: Record<string, AttendanceRecord>;
      };
      setSession(data.session);
      setRows(
        data.students.map((s) => {
          const existing = data.attendanceMap[s.id];
          return {
            student: s,
            status: existing?.status ?? "absent",
            notes: existing?.notes ?? "",
            dirty: false,
          };
        })
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => { load(); }, [load]);

  const setStatus = (studentId: string, status: Status) => {
    setRows((prev) =>
      prev.map((r) => r.student.id === studentId ? { ...r, status, dirty: true } : r)
    );
    setSaved(false);
  };

  const setNotes = (studentId: string, notes: string) => {
    setRows((prev) =>
      prev.map((r) => r.student.id === studentId ? { ...r, notes, dirty: true } : r)
    );
    setSaved(false);
  };

  const markAll = (status: Status) => {
    setRows((prev) => prev.map((r) => ({ ...r, status, dirty: true })));
    setSaved(false);
  };

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const records = rows.map((r) => ({
        student_id: r.student.id,
        status: r.status,
        notes: r.notes.trim() || null,
      }));
      const res = await fetch(`/api/sessions/${sessionId}/attendance-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to save attendance"));
      setRows((prev) => prev.map((r) => ({ ...r, dirty: false })));
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      toast(`Attendance saved for ${rows.length} students.`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const counts = React.useMemo(() => {
    const present = rows.filter((r) => r.status === "present").length;
    const late = rows.filter((r) => r.status === "late").length;
    const absent = rows.filter((r) => r.status === "absent").length;
    return { present, late, absent };
  }, [rows]);

  const dirtyCount = rows.filter((r) => r.dirty).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading session…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <Link
          href="/dashboard/sessions"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Sessions
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-slate-900">
            {session?.title ?? "Session"} — Attendance
          </h1>
          {session && (
            <p className="text-sm text-slate-500">{fmtDateTime(session.starts_at)}</p>
          )}
        </div>
      </div>

      {/* Stats + bulk actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{rows.length} students</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{counts.present} present</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{counts.late} late</span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">{counts.absent} absent</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Mark all:</span>
          {(["present", "late", "absent"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => markAll(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text} transition hover:opacity-90`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Attendance saved for all {rows.length} students.
        </div>
      )}

      {/* Student rows */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No active students are enrolled in this session's course.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card
              key={row.student.id}
              className={`border transition ${row.dirty ? "border-primary/40 bg-primary/[0.02]" : "border-slate-200"}`}
            >
              <CardHeader className="pb-2 pt-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">
                    {row.student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      {row.student.name}
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      {[row.student.program, row.student.class_name].filter(Boolean).join(" · ") || row.student.email || ""}
                    </p>
                  </div>
                  {/* Status buttons — large for mobile */}
                  <div className="flex gap-2">
                    {(["present", "late", "absent"] as Status[]).map((s) => {
                      const active = row.status === s;
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          onClick={() => setStatus(row.student.id, s)}
                          className={`min-h-[44px] min-w-[72px] rounded-lg px-3 text-sm font-semibold capitalize transition ${
                            active
                              ? `${cfg.bg} ${cfg.text} ring-2 ${cfg.ring} ring-offset-1`
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          aria-pressed={active}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                <Textarea
                  value={row.notes}
                  onChange={(e) => setNotes(row.student.id, e.target.value)}
                  placeholder="Note (optional)…"
                  className="min-h-[52px] resize-none text-sm"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sticky save bar */}
      {rows.length > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            onClick={saveAll}
            disabled={saving}
            size="lg"
            className="shadow-lg"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}` : "Save attendance"}
          </Button>
        </div>
      )}
    </div>
  );
}
