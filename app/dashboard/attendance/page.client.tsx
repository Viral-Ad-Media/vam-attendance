// File: app/dashboard/attendance/page.client.tsx
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader, Pencil, Trash2 } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { getAttendanceStatusColor } from "@/lib/helpers";
import {
  ResponsiveContainer,
  BarChart as RBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";
import {
  getAllSessions,
  getSessionAttendance,
  getAllStudents,
  recordAttendance,
} from "@/lib/supabase/database";

// Type definitions
type TabKey = "overview" | "teachers" | "students" | "sessions";
type Status = "present" | "absent" | "late";

interface Teacher {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  program: string;
  duration_weeks: number;
  sessions_per_week: number;
  class_name: string;
  teacher_id: string;
  created_at: string;
}

interface Session {
  id: string;
  teacher_id: string;
  title: string;
  starts_at: string;
  description?: string;
  created_at: string;
}

interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  status: Status;
  created_at: string;
}

// Utility functions
const toLocalDT = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const byId = <T extends { id: string }>(arr: T[]) => {
  const m = new Map<string, T>();
  arr.forEach((x) => m.set(x.id, x));
  return m;
};

// Component: Simple Modal
function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className={`relative ${maxWidth} w-full rounded-lg border bg-white p-4 shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-md hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Component: Confirm Dialog
function Confirm({
  open,
  onClose,
  title = "Are you sure?",
  message,
  onConfirm,
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: React.ReactNode;
  onConfirm: () => void;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-slate-600">{message}</div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={danger ? "bg-red-600 hover:bg-red-700" : ""}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
}

// Utility: Format date
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "Invalid date";
  }
};

async function readResponseError(response: Response, fallback: string) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return text || fallback;
  }
}

const statusSurface: Record<Status, string> = {
  present: "border-green-200 bg-green-50/70",
  absent: "border-red-200 bg-red-50/70",
  late: "border-amber-200 bg-amber-50/70",
};

const renderStatusBadge = (status: Status, size: "sm" | "xs" = "sm") => {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-[2px] text-[10px]";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold capitalize ${sizeClasses} ${getAttendanceStatusColor(
        status
      )}`}
    >
      {status}
    </span>
  );
};

/* Main Page Component */
function AttendancePage() {
  const [tab] = React.useState<TabKey>("sessions");

  const sb = React.useMemo(() => getBrowserSupabase(), []);

  // Data
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("list");
  const [attendancePage, setAttendancePage] = React.useState(1);
  const [attendancePageSize, setAttendancePageSize] = React.useState(10);

  // Filters & search
  const [teacherFilter] = React.useState<string>("all"); // hidden filter (always all)
  const [studentFilter, setStudentFilter] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);

  // Add Session modal
  const [openSession, setOpenSession] = React.useState(false);
  const [sessTeacherId, setSessTeacherId] = React.useState("");
  const [sessTitle, setSessTitle] = React.useState("");
  const [sessStartsAt, setSessStartsAt] = React.useState<string>("");
  const [sessionSaving, setSessionSaving] = React.useState(false);
  const [sessionError, setSessionError] = React.useState<string | null>(null);

  // Add Attendance modal
  const [openAttend, setOpenAttend] = React.useState(false);
  const [attendSessionId, setAttendSessionId] = React.useState("");
  const [attendStudentId, setAttendStudentId] = React.useState("");
  const [attendStatus, setAttendStatus] = React.useState<Status>("present");
  const [attendanceSaving, setAttendanceSaving] = React.useState(false);
  const [attendanceError, setAttendanceError] = React.useState<string | null>(null);

  // EDIT Teacher modal
  const [openEditTeacher, setOpenEditTeacher] = React.useState(false);
  const [editTeacherId, setEditTeacherId] = React.useState<string>("");
  const [editTName, setEditTName] = React.useState("");
  const [editTEmail, setEditTEmail] = React.useState("");

  // EDIT Student modal
  const [openEditStudent, setOpenEditStudent] = React.useState(false);
  const [editStudentId, setEditStudentId] = React.useState<string>("");
  const [editSName, setEditSName] = React.useState("");
  const [editSEmail, setEditSEmail] = React.useState("");
  const [editSProgram, setEditSProgram] = React.useState("");
  const [editSDuration, setEditSDuration] = React.useState<number | "">("");
  const [editSPerWeek, setEditSPerWeek] = React.useState<number | "">("");
  const [editSClass, setEditSClass] = React.useState("");
  const [editSTeacherId, setEditSTeacherId] = React.useState<string>("");

  // EDIT Session modal
  const [openEditSession, setOpenEditSession] = React.useState(false);
  const [editSessionId, setEditSessionId] = React.useState<string>("");
  const [editSessTeacherId, setEditSessTeacherId] = React.useState<string>("");
  const [editSessTitle, setEditSessTitle] = React.useState<string>("");
  const [editSessStartsAt, setEditSessStartsAt] = React.useState<string>("");

  // EDIT Attendance modal
  const [openEditAttendance, setOpenEditAttendance] = React.useState(false);
  const [editAttendSessionId, setEditAttendSessionId] = React.useState<string>("");
  const [editAttendStudentId, setEditAttendStudentId] = React.useState<string>("");
  const [editAttendStatus, setEditAttendStatus] =
    React.useState<Status>("present");
  const [editAttendKey, setEditAttendKey] = React.useState<{
    id: string;
    session_id: string;
    student_id: string;
  } | null>(null);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = React.useState<string[]>([]);
  const [bulkAttendStatus, setBulkAttendStatus] = React.useState<Status | "keep">("keep");
  const [bulkAttendanceSaving, setBulkAttendanceSaving] = React.useState(false);
  const [bulkAttendanceError, setBulkAttendanceError] = React.useState<string | null>(null);
  const [bulkAttendanceSuccess, setBulkAttendanceSuccess] = React.useState<string | null>(null);

  // CONFIRM deletions
  const [confirmTeacher, setConfirmTeacher] = React.useState<{
    open: boolean;
    id?: string;
    name?: string;
  }>({ open: false });
  const [confirmStudent, setConfirmStudent] = React.useState<{
    open: boolean;
    id?: string;
    name?: string;
  }>({ open: false });
  const [confirmSession, setConfirmSession] = React.useState<{
    open: boolean;
    id?: string;
    title?: string;
  }>({ open: false });
  const [confirmAttendance, setConfirmAttendance] = React.useState<{
    open: boolean;
    id?: string;
    label?: string;
  }>({ open: false });

  /* ------------ Loaders ------------ */
  const reload = React.useCallback(async () => {
    const [t, s, ss, a] = await Promise.all([
      fetch("/api/teachers", { cache: "no-store" }),
      fetch("/api/students", { cache: "no-store" }),
      fetch("/api/sessions", { cache: "no-store" }),
      fetch("/api/attendance", { cache: "no-store" }),
    ]);
    if (t.ok) setTeachers((await t.json()) as Teacher[]);
    if (s.ok) setStudents((await s.json()) as Student[]);
    if (ss.ok) setSessions((await ss.json()) as Session[]);
    if (a.ok) setAttendance((await a.json()) as Attendance[]);
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  // Poll-based refresh only when page mounts
  // (Subscriptions removed to simplify client requirements)

  /* ------------ Derived ------------ */
  const tMap = React.useMemo(() => byId(teachers), [teachers]);
  const sessionMap = React.useMemo(() => byId(sessions), [sessions]);

  const filteredStudents = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return students
      .filter((s) => {
        if (teacherFilter === "all") return true;
        const attendedWithTeacher = attendance.some((a) => {
          if (a.student_id !== s.id) return false;
          const sess = sessions.find((x) => x.id === a.session_id);
          return sess?.teacher_id === teacherFilter;
        });
        return attendedWithTeacher || false;
      })
      .filter((s) =>
        q
          ? `${s.name} ${s.email ?? ""} ${s.program ?? ""}`
              .toLowerCase()
              .includes(q)
          : true
      );
  }, [students, teacherFilter, attendance, sessions, deferredQuery]);

  const filteredAttendance = React.useMemo(
    () =>
      attendance.filter((a) => {
        if (studentFilter !== "all" && a.student_id !== studentFilter) return false;
        if (teacherFilter !== "all") {
          const sess = sessionMap.get(a.session_id);
          if (sess?.teacher_id !== teacherFilter) return false;
        }
        const q = deferredQuery.trim().toLowerCase();
        if (q) {
          const student = students.find((s) => s.id === a.student_id);
          const session = sessionMap.get(a.session_id);
          const haystack = `${student?.name ?? ""} ${student?.email ?? ""} ${student?.program ?? ""} ${session?.title ?? ""}`.toLowerCase();
          return haystack.includes(q);
        }
        return true;
      }),
    [attendance, deferredQuery, sessionMap, studentFilter, students, teacherFilter]
  );
  const attendanceTotalPages = Math.max(1, Math.ceil(filteredAttendance.length / attendancePageSize));
  React.useEffect(() => {
    setAttendancePage((currentPage) => Math.min(currentPage, attendanceTotalPages));
  }, [attendanceTotalPages]);
  const paginatedAttendance = React.useMemo(() => {
    const start = (attendancePage - 1) * attendancePageSize;
    return filteredAttendance.slice(start, start + attendancePageSize);
  }, [filteredAttendance, attendancePage, attendancePageSize]);
  const visibleAttendanceIds = React.useMemo(
    () => paginatedAttendance.map((record) => record.id),
    [paginatedAttendance]
  );
  const selectedAttendance = React.useMemo(
    () => attendance.filter((record) => selectedAttendanceIds.includes(record.id)),
    [attendance, selectedAttendanceIds]
  );
  const selectedVisibleAttendanceCount = visibleAttendanceIds.filter((id) =>
    selectedAttendanceIds.includes(id)
  ).length;
  const allVisibleAttendanceSelected =
    visibleAttendanceIds.length > 0 && selectedVisibleAttendanceCount === visibleAttendanceIds.length;

  React.useEffect(() => {
    const currentIds = new Set(attendance.map((record) => record.id));
    setSelectedAttendanceIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [attendance]);

  const toggleAttendanceSelection = (id: string, checked: boolean) => {
    setBulkAttendanceError(null);
    setBulkAttendanceSuccess(null);
    setSelectedAttendanceIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((existingId) => existingId !== id);
    });
  };

  const toggleFilteredAttendanceSelection = (checked: boolean) => {
    setBulkAttendanceError(null);
    setBulkAttendanceSuccess(null);
    setSelectedAttendanceIds((prev) => {
      const visibleIdSet = new Set(visibleAttendanceIds);
      if (!checked) return prev.filter((id) => !visibleIdSet.has(id));
      return Array.from(new Set([...prev, ...visibleAttendanceIds]));
    });
  };

  const clearAttendanceSelection = () => {
    setSelectedAttendanceIds([]);
    setBulkAttendanceError(null);
    setBulkAttendanceSuccess(null);
  };

  const filteredSessions = React.useMemo(
    () =>
      sessions.filter((s) =>
        teacherFilter === "all" ? true : s.teacher_id === teacherFilter
      ),
    [sessions, teacherFilter]
  );

  const kpis = React.useMemo(() => {
    const totalStudents = students.length;
    const totalTeachers = teachers.length;
    const totalSessions = sessions.length;
    const totalMarks = attendance.length;
    const totalPresent = attendance.filter(
      (a) => a.status === "present"
    ).length;
    const rate = totalMarks ? totalPresent / totalMarks : 0;
    return {
      totalStudents,
      totalTeachers,
      totalSessions,
      totalMarks,
      attendanceRate: rate,
    };
  }, [students, teachers, sessions, attendance]);

  const canSaveSession = Boolean(sessTeacherId && sessStartsAt && !sessionSaving);
  const canSaveAttendance = Boolean(
    attendSessionId && attendStudentId && attendStatus && !attendanceSaving
  );

  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

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

  const attendanceByDay = React.useMemo(() => {
    const map = new Map<string, Attendance[]>();
    filteredAttendance.forEach((a) => {
      const sess = sessionMap.get(a.session_id);
      if (!sess) return;
      const key = new Date(sess.starts_at).toDateString();
      const arr = map.get(key) || [];
      arr.push(a);
      map.set(key, arr);
    });
    return map;
  }, [filteredAttendance, sessionMap]);

  const addSessionRPC = async () => {
    if (!sessTeacherId || !sessStartsAt) return;
    setSessionSaving(true);
    setSessionError(null);
    try {
      const startsAt = new Date(sessStartsAt).toISOString();
      const payload = {
        teacher_id: sessTeacherId || undefined,
        title: sessTitle.trim() || undefined,
        starts_at: startsAt,
      };
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        let message = "Failed to create session";
        try {
          const parsed = JSON.parse(text);
          message = parsed.error || parsed.message || message;
        } catch {
          if (text) message = text;
        }
        setSessionError(message);
        return;
      }
      setSessTeacherId("");
      setSessTitle("");
      setSessStartsAt("");
      setOpenSession(false);
      await reload();
    } catch (err) {
      setSessionError(
        err instanceof Error ? err.message : "Unexpected error while creating session"
      );
    } finally {
      setSessionSaving(false);
    }
  };

  const addAttendance = async () => {
    if (!attendSessionId || !attendStudentId) return;
    setAttendanceSaving(true);
    setAttendanceError(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: attendSessionId,
          student_id: attendStudentId,
          status: attendStatus,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let message = "Failed to record attendance";
        try {
          const parsed = JSON.parse(text);
          message = parsed.error || parsed.message || message;
        } catch {
          if (text) message = text;
        }
        setAttendanceError(message);
        return;
      }
      setAttendSessionId("");
      setAttendStudentId("");
      setAttendStatus("present");
      setOpenAttend(false);
      await reload();
    } catch (err) {
      setAttendanceError(
        err instanceof Error ? err.message : "Unexpected error while saving attendance"
      );
    } finally {
      setAttendanceSaving(false);
    }
  };

  /* ------------ EDIT flows ------------ */
  const onOpenEditTeacher = (t: Teacher) => {
    setEditTeacherId(t.id);
    setEditTName(t.name);
    setEditTEmail(t.email ?? "");
    setOpenEditTeacher(true);
  };
  const saveEditTeacher = async () => {
    if (!sb) return;
    if (!editTeacherId) return;
    const name = editTName.trim();
    const email = editTEmail.trim() || null;
    const { error } = await sb
      .from("teachers")
      .update({ name, email })
      .eq("id", editTeacherId);
    if (error) {
      console.error(error);
      return;
    }
    setOpenEditTeacher(false);
    setEditTeacherId("");
    setEditTName("");
    setEditTEmail("");
  };

  const onOpenEditStudent = async (s: Student) => {
    if (!sb) return;
    setEditStudentId(s.id);
    setEditSName(s.name);
    setEditSEmail(s.email ?? "");
    setEditSProgram(s.program ?? "");
    setEditSDuration(s.duration_weeks ?? "");
    setEditSPerWeek(s.sessions_per_week ?? "");
    setEditSClass(s.class_name ?? "");

    const { data } = await sb
      .from("teacher_students")
      .select("teacher_id")
      .eq("student_id", s.id)
      .limit(1);
    const teacherRow = data?.[0] as { teacher_id?: string } | undefined;
    setEditSTeacherId(teacherRow?.teacher_id ?? "");

    setOpenEditStudent(true);
  };

  const saveEditStudent = async () => {
    if (!sb) return;
    if (!editStudentId) return;
    const { error: e1 } = await sb
      .from("students")
      .update({
        name: editSName.trim(),
        email: editSEmail.trim() || null,
        program: editSProgram.trim() || null,
        duration_weeks:
          editSDuration === "" ? null : Number(editSDuration),
        sessions_per_week:
          editSPerWeek === "" ? null : Number(editSPerWeek),
        class_name: editSClass.trim() || null,
      })
      .eq("id", editStudentId);
    if (e1) {
      console.error(e1);
      return;
    }

    if (editSTeacherId) {
      await sb
        .from("teacher_students")
        .delete()
        .eq("student_id", editStudentId);
      const { error: e2 } = await sb
        .from("teacher_students")
        .insert({ teacher_id: editSTeacherId, student_id: editStudentId });
      if (e2) {
        console.error(e2);
        return;
      }
    }
    setOpenEditStudent(false);
    setEditStudentId("");
    setEditSName("");
    setEditSEmail("");
    setEditSProgram("");
    setEditSDuration("");
    setEditSPerWeek("");
    setEditSClass("");
    setEditSTeacherId("");
  };

  const onOpenEditSession = (s: Session) => {
    setEditSessionId(s.id);
    setEditSessTeacherId(s.teacher_id ?? "");
    setEditSessTitle(s.title ?? "");
    setEditSessStartsAt(toLocalDT(s.starts_at));
    setOpenEditSession(true);
  };
  const saveEditSession = async () => {
    if (!sb) return;
    if (!editSessionId) return;
    const payload: Partial<Session> = {
      teacher_id: editSessTeacherId as string,
      title: editSessTitle as string,
      starts_at: new Date(editSessStartsAt).toISOString(),
    };
    const { error } = await sb
      .from("sessions")
      .update(payload)
      .eq("id", editSessionId);
    if (error) {
      console.error(error);
      return;
    }
    setOpenEditSession(false);
    setEditSessionId("");
    setEditSessTeacherId("");
    setEditSessTitle("");
    setEditSessStartsAt("");
  };

  const onOpenEditAttendance = (a: Attendance) => {
    setEditAttendKey({
      id: a.id,
      session_id: a.session_id,
      student_id: a.student_id,
    });
    setEditAttendSessionId(a.session_id);
    setEditAttendStudentId(a.student_id);
    setEditAttendStatus(a.status);
    setOpenEditAttendance(true);
  };
  const saveEditAttendance = async () => {
    if (!editAttendKey) return;
    const changedKey =
      editAttendKey.session_id !== editAttendSessionId ||
      editAttendKey.student_id !== editAttendStudentId;
    if (changedKey) {
      const delRes = await fetch(`/api/attendance/${editAttendKey.id}`, {
        method: "DELETE",
      });
      if (!delRes.ok) {
        console.error(await delRes.text());
        return;
      }
      const insRes = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: editAttendSessionId,
          student_id: editAttendStudentId,
          status: editAttendStatus,
        }),
      });
      if (!insRes.ok) {
        console.error(await insRes.text());
        return;
      }
    } else {
      const updRes = await fetch(`/api/attendance/${editAttendKey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editAttendStatus }),
      });
      if (!updRes.ok) {
        console.error(await updRes.text());
        return;
      }
    }
    await reload();
    setOpenEditAttendance(false);
    setEditAttendKey(null);
    setEditAttendSessionId("");
    setEditAttendStudentId("");
    setEditAttendStatus("present");
  };

  /* ------------ DELETE ------------ */
  const doDeleteTeacher = async (id?: string) => {
    if (!sb || !id) return;
    await sb.from("teachers").delete().eq("id", id);
  };
  const doDeleteStudent = async (id?: string) => {
    if (!sb || !id) return;
    await sb.from("students").delete().eq("id", id);
  };
  const doDeleteSession = async (id?: string) => {
    if (!sb || !id) return;
    await sb.from("sessions").delete().eq("id", id);
  };
  const doDeleteAttendance = async (id?: string) => {
    if (!id) return;
    await fetch(`/api/attendance/${id}`, { method: "DELETE" });
    await reload();
  };

  const applyBulkAttendanceStatus = async () => {
    if (!selectedAttendanceIds.length) return;
    if (bulkAttendStatus === "keep") {
      setBulkAttendanceError("Choose a status before applying changes.");
      setBulkAttendanceSuccess(null);
      return;
    }

    setBulkAttendanceSaving(true);
    setBulkAttendanceError(null);
    setBulkAttendanceSuccess(null);
    try {
      await Promise.all(
        selectedAttendanceIds.map(async (id) => {
          const res = await fetch(`/api/attendance/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: bulkAttendStatus }),
          });
          if (!res.ok) throw new Error(await readResponseError(res, "Failed to update attendance"));
        })
      );

      const changedCount = selectedAttendanceIds.length;
      await reload();
      setSelectedAttendanceIds([]);
      setBulkAttendStatus("keep");
      setBulkAttendanceSuccess(`${changedCount} attendance mark${changedCount === 1 ? "" : "s"} updated.`);
    } catch (err) {
      setBulkAttendanceError(err instanceof Error ? err.message : "Failed to update attendance");
    } finally {
      setBulkAttendanceSaving(false);
    }
  };

  const deleteBulkAttendance = async () => {
    if (!selectedAttendanceIds.length) return;
    const confirmed = confirm(
      `Delete ${selectedAttendanceIds.length} selected attendance mark${selectedAttendanceIds.length === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;

    setBulkAttendanceSaving(true);
    setBulkAttendanceError(null);
    setBulkAttendanceSuccess(null);
    try {
      await Promise.all(
        selectedAttendanceIds.map(async (id) => {
          const res = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error(await readResponseError(res, "Failed to delete attendance"));
        })
      );

      const removedCount = selectedAttendanceIds.length;
      await reload();
      setSelectedAttendanceIds([]);
      setBulkAttendanceSuccess(`${removedCount} attendance mark${removedCount === 1 ? "" : "s"} deleted.`);
    } catch (err) {
      setBulkAttendanceError(err instanceof Error ? err.message : "Failed to delete attendance");
    } finally {
      setBulkAttendanceSaving(false);
    }
  };

  /* ------------ Charts data ------------ */
  const sessionChart = React.useMemo(
    () =>
      filteredSessions.map((s) => {
        const total = attendance.filter((a) => a.session_id === s.id).length;
        const present = attendance.filter(
          (a) => a.session_id === s.id && a.status === "present"
        ).length;
        return {
          name: `${s.title ?? "Session"} • ${fmtDate(s.starts_at)}`,
          present,
          total,
        };
      }),
    [filteredSessions, attendance]
  );

  /* ------------ Render ------------ */
  return (
    <div className="w-full">
      <TopBar
        title="Attendance"
        subtitle="Student Attendance Tracking"
        showAccountInTitle={false}
        showAccountIdInSubtitle={false}
      />

      {/* Panels */}
      {tab === "overview" && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Stat title="Teachers" value={teachers.length} />
            <Stat title="Students" value={students.length} />
            <Stat title="Sessions" value={sessions.length} />
            <Stat
              title="Attendance Rate"
              value={`${(kpis.attendanceRate * 100).toFixed(1)}%`}
            />
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Attendance by Session
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <RBarChart data={sessionChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="present"
                    name="Present"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]} />
                </RBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "teachers" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Teachers
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Students</th>
                  <th className="py-2 pr-0 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => {
                  const studentIds = new Set(
                    attendance
                      .filter(
                        (a) =>
                          sessions.find((s) => s.id === a.session_id)
                            ?.teacher_id === t.id
                      )
                      .map((a) => a.student_id)
                  );
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="py-2 pr-3">{t.name}</td>
                      <td className="py-2 pr-3">{t.email ?? "—"}</td>
                      <td className="py-2 pr-3">{studentIds.size}</td>
                      <td className="py-2 pr-0 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenEditTeacher(t)}
                          >
                            <Pencil className="mr-1 h-4 w-4" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() =>
                              setConfirmTeacher({
                                open: true,
                                id: t.id,
                                name: t.name,
                              })
                            }
                          >
                            <Trash2 className="mr-1 h-4 w-4" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!teachers.length && (
                  <tr>
                    <td
                      className="py-6 text-center text-slate-500"
                      colSpan={4}
                    >
                      No teachers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "students" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Students
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Program</th>
                  <th className="py-2 pr-3">Sessions/Week</th>
                  <th className="py-2 pr-3">Attendance Rate</th>
                  <th className="py-2 pr-0 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const marks = attendance.filter(
                    (a) => a.student_id === s.id
                  );
                  const present = marks.filter(
                    (m) => m.status === "present"
                  ).length;
                  const rate = marks.length
                    ? present / marks.length
                    : 0;
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="py-2 pr-3">{s.name}</td>
                      <td className="py-2 pr-3">
                        {s.program ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {s.sessions_per_week ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {(rate * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 pr-0 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenEditStudent(s)}
                          >
                            <Pencil className="mr-1 h-4 w-4" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() =>
                              setConfirmStudent({
                                open: true,
                                id: s.id,
                                name: s.name,
                              })
                            }
                          >
                            <Trash2 className="mr-1 h-4 w-4" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredStudents.length && (
                  <tr>
                    <td
                      className="py-6 text-center text-slate-500"
                      colSpan={5}
                    >
                      No students match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "sessions" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-sm font-semibold flex-1 min-w-[140px]">
                  Attendance ({viewMode === "list" ? "List" : "Calendar"} view)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="w-[200px]">
                    <Select
                      value={studentFilter}
                      onValueChange={(value) => {
                        setStudentFilter(value);
                        setAttendancePage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Filter by student" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
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
                  <div className="flex-1 min-w-[180px] max-w-[260px]">
                    <Input
                      placeholder="Search student / email / program…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setAttendancePage(1);
                      }}
                      className="h-9"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setAttendanceError(null);
                      setOpenAttend(true);
                    }}
                  >
                    Add Attendance
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-0">
              {viewMode === "list" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedAttendanceIds.length
                            ? `${selectedAttendanceIds.length} selected`
                            : "Bulk edit attendance"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Apply one status to selected attendance marks or delete them in one pass.
                        </p>
                      </div>
                      {selectedAttendanceIds.length ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAttendanceSelection}
                          disabled={bulkAttendanceSaving}
                        >
                          Clear Selection
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-[minmax(150px,1fr)_auto_auto]">
                      <Select
                        value={bulkAttendStatus}
                        onValueChange={(value: Status | "keep") => setBulkAttendStatus(value)}
                        disabled={!selectedAttendanceIds.length || bulkAttendanceSaving}
                      >
                        <SelectTrigger className="h-9 w-full bg-white">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keep">Choose status</SelectItem>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={!selectedAttendanceIds.length || bulkAttendanceSaving}
                        onClick={applyBulkAttendanceStatus}
                      >
                        {bulkAttendanceSaving ? <Loader className="h-4 w-4 animate-spin" /> : "Apply Status"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        disabled={!selectedAttendanceIds.length || bulkAttendanceSaving}
                        onClick={deleteBulkAttendance}
                      >
                        Delete Selected
                      </Button>
                    </div>
                    {selectedAttendance.length ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Selected:{" "}
                        {selectedAttendance
                          .slice(0, 3)
                          .map((record) => students.find((s) => s.id === record.student_id)?.name ?? "Unknown student")
                          .join(", ")}
                        {selectedAttendance.length > 3 ? `, +${selectedAttendance.length - 3} more` : ""}
                      </p>
                    ) : null}
                    {bulkAttendanceError ? (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {bulkAttendanceError}
                      </div>
                    ) : null}
                    {bulkAttendanceSuccess ? (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {bulkAttendanceSuccess}
                      </div>
                    ) : null}
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="w-10 py-2 pr-3">
                          <Checkbox
                            checked={allVisibleAttendanceSelected}
                            disabled={!visibleAttendanceIds.length || bulkAttendanceSaving}
                            aria-label="Select visible attendance"
                            onCheckedChange={toggleFilteredAttendanceSelection}
                          />
                        </th>
                        <th className="py-2 pr-3">Session</th>
                        <th className="py-2 pr-3">Student</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-0 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAttendance.map((a) => {
                        const sess = sessionMap.get(a.session_id);
                        const stu = students.find((s) => s.id === a.student_id);
                        const selected = selectedAttendanceIds.includes(a.id);
                        return (
                          <tr
                            key={a.id}
                            className={`border-t ${selected ? "bg-primary/5" : ""}`}
                          >
                            <td className="py-2 pr-3">
                              <Checkbox
                                checked={selected}
                                disabled={bulkAttendanceSaving}
                                aria-label={`Select attendance for ${stu?.name ?? "student"}`}
                                onCheckedChange={(checked) => toggleAttendanceSelection(a.id, checked)}
                              />
                            </td>
                            <td className="py-2 pr-3">
                              {(sess?.title ?? "Session")} •{" "}
                              {sess ? fmtDate(sess.starts_at) : ""}
                            </td>
                            <td className="py-2 pr-3">
                              {stu?.name ?? "—"}
                            </td>
                            <td className="py-2 pr-3">
                              {renderStatusBadge(a.status)}
                            </td>
                            <td className="py-2 pr-0 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onOpenEditAttendance(a)}
                                >
                                  <Pencil className="mr-1 h-4 w-4" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() =>
                                    setConfirmAttendance({
                                      open: true,
                                      id: a.id,
                                      label: `${stu?.name ?? "Student"} • ${
                                        sess?.title ?? "Session"
                                      }`,
                                    })
                                  }
                                >
                                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredAttendance.length && (
                        <tr>
                          <td
                            className="py-6 text-center text-slate-500"
                            colSpan={5}
                          >
                            No attendance yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {filteredAttendance.length > 0 && (
                    <PaginationControls
                      page={attendancePage}
                      pageSize={attendancePageSize}
                      totalItems={filteredAttendance.length}
                      itemLabel="attendance marks"
                      onPageChange={setAttendancePage}
                      onPageSizeChange={(pageSize) => {
                        setAttendancePageSize(pageSize);
                        setAttendancePage(1);
                      }}
                    />
                  )}
                </div>
              )}

              {viewMode === "calendar" && (
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
                      {new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString(
                        undefined,
                        { month: "long", year: "numeric" }
                      )}
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
                      const dayAttendance = attendanceByDay.get(key) || [];
                      const isToday =
                        new Date().toDateString() === date.toDateString();
                      const inMonth = date.getMonth() === calendarMonth.month;
                      return (
                        <div
                          key={key}
                          className={`min-h-[110px] rounded-lg border p-2 text-xs ${
                            inMonth ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
                          } ${isToday ? "ring-1 ring-primary" : ""}`}
                        >
                          <div className="mb-1 flex items-center justify-between text-slate-600">
                            <span className="text-[11px] font-semibold">
                              {date.getDate()}
                            </span>
                            {isToday && (
                              <span className="text-[10px] font-semibold text-primary">
                                Today
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {dayAttendance.map((a) => {
                              const sess = sessionMap.get(a.session_id);
                              const stu = students.find((s) => s.id === a.student_id);
                              return (
                                <div
                                  key={`${a.session_id}:${a.student_id}`}
                                  className={`rounded border px-2 py-1 ${statusSurface[a.status]}`}
                                >
                                  <div className="mb-0.5 flex items-center justify-between">
                                    <div className="text-[11px] font-semibold text-slate-800">
                                      {stu?.name ?? "Student"}
                                    </div>
                                    {renderStatusBadge(a.status, "xs")}
                                  </div>
                                  <div className="text-[10px] text-slate-600">
                                    {sess?.title ?? "Session"}
                                  </div>
                                </div>
                              );
                            })}
                            {!dayAttendance.length && (
                              <div className="rounded border border-dashed border-slate-200 px-2 py-1 text-slate-400">
                                No attendance
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
        </div>
      )}

      <Modal
        open={openSession}
        onClose={() => {
          setOpenSession(false);
          setSessionError(null);
        }}
        title="Add Session"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select
            value={sessTeacherId}
            onValueChange={setSessTeacherId}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Title (optional)"
            value={sessTitle}
            onChange={(e) => setSessTitle(e.target.value)}
            className="h-9"
          />
          <Input
            type="datetime-local"
            value={sessStartsAt}
            onChange={(e) => setSessStartsAt(e.target.value)}
            className="h-9 sm:col-span-2"
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setOpenSession(false);
              setSessionError(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={addSessionRPC} disabled={!canSaveSession}>
            {sessionSaving && <Loader className="mr-1 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
        {sessionError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {sessionError}
          </div>
        )}
      </Modal>

      <Modal
        open={openAttend}
        onClose={() => {
          setOpenAttend(false);
          setAttendanceError(null);
        }}
        title="Add Attendance"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select
            value={attendSessionId}
            onValueChange={setAttendSessionId}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {(s.title ?? "Session")} • {fmtDate(s.starts_at)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={attendStudentId}
            onValueChange={setAttendStudentId}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((st) => (
                <SelectItem key={st.id} value={st.id}>
                  {st.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={attendStatus}
            onValueChange={(v: Status) => setAttendStatus(v)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setOpenAttend(false);
              setAttendanceError(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={addAttendance} disabled={!canSaveAttendance}>
            {attendanceSaving && <Loader className="mr-1 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
        {attendanceError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {attendanceError}
          </div>
        )}
      </Modal>

      {/* --------- Edit Modals --------- */}
      <Modal
        open={openEditTeacher}
        onClose={() => setOpenEditTeacher(false)}
        title="Edit Teacher"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            placeholder="Full name"
            value={editTName}
            onChange={(e) => setEditTName(e.target.value)}
            className="h-9 sm:col-span-2"
          />
          <Input
            placeholder="Email (optional)"
            value={editTEmail}
            onChange={(e) => setEditTEmail(e.target.value)}
            className="h-9 sm:col-span-2"
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenEditTeacher(false)}>
            Cancel
          </Button>
          <Button onClick={saveEditTeacher}>Save Changes</Button>
        </div>
      </Modal>

      <Modal
        open={openEditStudent}
        onClose={() => setOpenEditStudent(false)}
        title="Edit Student"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            placeholder="Full name"
            value={editSName}
            onChange={(e) => setEditSName(e.target.value)}
            className="h-9 sm:col-span-2"
          />
          <Input
            placeholder="Email (optional)"
            value={editSEmail}
            onChange={(e) => setEditSEmail(e.target.value)}
            className="h-9 sm:col-span-2"
          />
          <Input
            placeholder="Program"
            value={editSProgram}
            onChange={(e) => setEditSProgram(e.target.value)}
            className="h-9 sm:col-span-2"
          />
          <Input
            placeholder="Duration (weeks)"
            inputMode="numeric"
            value={editSDuration === "" ? "" : editSDuration}
            onChange={(e) =>
              setEditSDuration(
                e.target.value ? Number(e.target.value) : ""
              )
            }
            className="h-9"
          />
          <Input
            placeholder="Sessions / week"
            inputMode="numeric"
            value={editSPerWeek === "" ? "" : editSPerWeek}
            onChange={(e) =>
              setEditSPerWeek(
                e.target.value ? Number(e.target.value) : ""
              )
            }
            className="h-9"
          />
          <Input
            placeholder="Class name"
            value={editSClass}
            onChange={(e) => setEditSClass(e.target.value)}
            className="h-9 sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <Select
              value={editSTeacherId}
              onValueChange={setEditSTeacherId}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Assign to teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpenEditStudent(false)}
          >
            Cancel
          </Button>
          <Button onClick={saveEditStudent}>Save Changes</Button>
        </div>
      </Modal>

      <Modal
        open={openEditSession}
        onClose={() => setOpenEditSession(false)}
        title="Edit Session"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select
            value={editSessTeacherId}
            onValueChange={setEditSessTeacherId}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Title (optional)"
            value={editSessTitle}
            onChange={(e) => setEditSessTitle(e.target.value)}
            className="h-9"
          />
          <Input
            type="datetime-local"
            value={editSessStartsAt}
            onChange={(e) => setEditSessStartsAt(e.target.value)}
            className="h-9 sm:col-span-2"
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpenEditSession(false)}
          >
            Cancel
          </Button>
          <Button onClick={saveEditSession}>Save Changes</Button>
        </div>
      </Modal>

      <Modal
        open={openEditAttendance}
        onClose={() => setOpenEditAttendance(false)}
        title="Edit Attendance"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select
            value={editAttendSessionId}
            onValueChange={setEditAttendSessionId}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {(s.title ?? "Session")} • {fmtDate(s.starts_at)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={editAttendStudentId}
            onValueChange={setEditAttendStudentId}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((st) => (
                <SelectItem key={st.id} value={st.id}>
                  {st.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={editAttendStatus}
            onValueChange={(v: Status) => setEditAttendStatus(v)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpenEditAttendance(false)}
          >
            Cancel
          </Button>
          <Button onClick={saveEditAttendance}>Save Changes</Button>
        </div>
      </Modal>

      {/* --------- Confirm Modals --------- */}
      <Confirm
        open={confirmTeacher.open}
        onClose={() => setConfirmTeacher({ open: false })}
        title="Delete teacher?"
        message={
          <span>
            This will remove <b>{confirmTeacher.name}</b> and may cascade
            links/sessions depending on policies.
          </span>
        }
        onConfirm={() => doDeleteTeacher(confirmTeacher.id)}
        danger
      />
      <Confirm
        open={confirmStudent.open}
        onClose={() => setConfirmStudent({ open: false })}
        title="Delete student?"
        message={
          <span>
            This will remove <b>{confirmStudent.name}</b> and related
            links/attendance.
          </span>
        }
        onConfirm={() => doDeleteStudent(confirmStudent.id)}
        danger
      />
      <Confirm
        open={confirmSession.open}
        onClose={() => setConfirmSession({ open: false })}
        title="Delete session?"
        message={
          <span>
            Delete <b>{confirmSession.title}</b> and its attendance?
          </span>
        }
        onConfirm={() => doDeleteSession(confirmSession.id)}
        danger
      />
      <Confirm
        open={confirmAttendance.open}
        onClose={() => setConfirmAttendance({ open: false })}
        title="Delete attendance?"
        message={
          <span>
            Remove attendance for <b>{confirmAttendance.label}</b>?
          </span>
        }
        onConfirm={() => doDeleteAttendance(confirmAttendance.id)}
        danger
      />
    </div>
  );
}

/* ---------------- Small KPI Card ---------------- */
function Stat({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card className="border bg-white">
      <CardContent className="py-3">
        <div className="text-[11px] text-slate-500">{title}</div>
        <div className="text-lg font-semibold text-slate-800">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default AttendancePage;
