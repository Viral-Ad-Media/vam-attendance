// app/dashboard/courses/page.client.tsx
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Loader2 } from "lucide-react";
import Link from "next/link";

type Course = {
  id: string;
  title: string;
  description?: string | null;
  modality: "group" | "1on1";
  lead_teacher_id?: string | null;
  course_type?: string | null;
  duration_weeks?: number | null;
  sessions_per_week?: number | null;
  max_students?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

type Enrollment = {
  id: string;
  course_id: string;
  student_id: string;
  teacher_id?: string | null;
  status: "active" | "paused" | "completed" | "dropped";
  enrolled_at?: string | null;
};

type Teacher = { id: string; name: string };
type Student = { id: string; name: string };

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const defaultDaysFromCount = (count?: number | null) => {
  const order = [1, 3, 5, 2, 4, 0, 6]; // start with Mon/Wed/Fri pattern
  if (!count || count <= 0) return [];
  return order.slice(0, Math.min(count, 7));
};

export default function CoursesPage() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openEditCourse, setOpenEditCourse] = React.useState(false);
  const [editCourseId, setEditCourseId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editModality, setEditModality] = React.useState<"group" | "1on1">("group");
  const [editLeadTeacher, setEditLeadTeacher] = React.useState<string | null>(null);
  const [editType, setEditType] = React.useState("");
  const [editDuration, setEditDuration] = React.useState("");
  const [editMeetingDays, setEditMeetingDays] = React.useState<number[]>([]);
  const [editMaxStudents, setEditMaxStudents] = React.useState("");
  const [editStartsAt, setEditStartsAt] = React.useState("");
  const [editEndsAt, setEditEndsAt] = React.useState("");
  const [editStudentSearch, setEditStudentSearch] = React.useState("");
  const [editSelectedStudents, setEditSelectedStudents] = React.useState<string[]>([]);
  const [courseSaving, setCourseSaving] = React.useState(false);
  const [courseError, setCourseError] = React.useState<string | null>(null);
  const [openCourseDetail, setOpenCourseDetail] = React.useState(false);
  const [detailCourse, setDetailCourse] = React.useState<Course | null>(null);

  const loadAll = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cRes, eRes, tRes, sRes] = await Promise.all([
        fetch("/api/courses", { cache: "no-store" }),
        fetch("/api/enrollments", { cache: "no-store" }),
        fetch("/api/teachers", { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
      ]);
      if (!cRes.ok) throw new Error(await cRes.text());
      if (!eRes.ok) throw new Error(await eRes.text());
      if (!tRes.ok) throw new Error(await tRes.text());
      if (!sRes.ok) throw new Error(await sRes.text());
      setCourses((await cRes.json()) as Course[]);
      setEnrollments((await eRes.json()) as Enrollment[]);
      setTeachers((await tRes.json()) as Teacher[]);
      setStudents((await sRes.json()) as Student[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  const teacherById = React.useMemo(() => new Map(teachers.map((t) => [t.id, t.name])), [teachers]);
  const studentById = React.useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  const courseStats = React.useMemo(() => {
    const map = new Map<string, { total: number; active: number }>();
    courses.forEach((c) => map.set(c.id, { total: 0, active: 0 }));
    enrollments.forEach((en) => {
      const entry = map.get(en.course_id);
      if (!entry) return;
      entry.total += 1;
      if (en.status === "active") entry.active += 1;
    });
    return map;
  }, [courses, enrollments]);

  const enrollmentsByCourse = React.useMemo(() => {
    const map = new Map<string, Enrollment[]>();
    enrollments.forEach((en) => {
      const arr = map.get(en.course_id) || [];
      arr.push(en);
      map.set(en.course_id, arr);
    });
    return map;
  }, [enrollments]);

  const filteredCourses = courses.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q) ||
      (c.modality || "").toLowerCase().includes(q)
    );
  });

  const saveCourse = async () => {
    if (!editCourseId) return;
    setCourseSaving(true);
    setCourseError(null);
    try {
      const payload: any = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        modality: editModality,
        lead_teacher_id: editLeadTeacher || null,
        course_type: editType.trim() || null,
        duration_weeks: editDuration ? Number(editDuration) : null,
        sessions_per_week: editMeetingDays.length ? editMeetingDays.length : null,
        meeting_days: editMeetingDays.length ? editMeetingDays : undefined,
        max_students: editMaxStudents ? Number(editMaxStudents) : null,
        starts_at: editStartsAt ? new Date(editStartsAt).toISOString() : null,
        ends_at: editEndsAt ? new Date(editEndsAt).toISOString() : null,
      };
      const res = await fetch(`/api/courses/${editCourseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          setCourseError(parsed.error || parsed.message || "Failed to update course");
        } catch {
          setCourseError(text || "Failed to update course");
        }
        return;
      }
      const currentEnrollments = enrollments.filter((en) => en.course_id === editCourseId);
      const existingStudentIds = currentEnrollments.map((en) => en.student_id);
      const toAdd = editSelectedStudents.filter((sid) => !existingStudentIds.includes(sid));
      const toRemove = currentEnrollments.filter((en) => !editSelectedStudents.includes(en.student_id));

      for (const sid of toAdd) {
        const addRes = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: sid,
            course_id: editCourseId,
            status: "active",
            teacher_id: editLeadTeacher || null,
          }),
        });
        if (!addRes.ok) throw new Error(await addRes.text());
      }

      for (const en of toRemove) {
        const delRes = await fetch(`/api/enrollments/${en.id}`, { method: "DELETE" });
        if (!delRes.ok) throw new Error(await delRes.text());
      }

      await loadAll();
      setOpenEditCourse(false);
      setEditCourseId(null);
      setEditSelectedStudents([]);
    } catch (err) {
      setCourseError(err instanceof Error ? err.message : "Failed to update course");
    } finally {
      setCourseSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <TopBar title="Courses" subtitle="Manage courses and enrollments" showAccountInTitle={false} />

      {loading && (
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-800">Courses</CardTitle>
                <p className="text-xs text-slate-500">All active programs and cohorts</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search courses…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-[220px]"
                />
                <Button
                  onClick={() => {
                    setEditCourseId(null);
                    setEditTitle("");
                    setEditDescription("");
                    setEditModality("group");
                    setEditLeadTeacher(null);
                    setEditType("");
                    setEditDuration("");
                    setEditMeetingDays([]);
                    setEditMaxStudents("");
                    setEditStartsAt("");
                    setEditEndsAt("");
                    setEditSelectedStudents([]);
                    setOpenEditCourse(true);
                  }}
                >
                  + New Course
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course) => {
                const stats = courseStats.get(course.id) || { total: 0, active: 0 };
                const days =
                  course.sessions_per_week && course.sessions_per_week > 0
                    ? defaultDaysFromCount(course.sessions_per_week)
                    : null;
                return (
                  <div key={course.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-500" />
                          <p className="text-sm font-semibold text-slate-900 line-clamp-1">{course.title}</p>
                        </div>
                        <p className="text-xs text-slate-500 capitalize">{course.modality}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditCourseId(course.id);
                          setEditTitle(course.title || "");
                          setEditDescription(course.description || "");
                          setEditModality(course.modality || "group");
                          setEditLeadTeacher(course.lead_teacher_id || null);
                          setEditType(course.course_type || "");
                          setEditDuration(course.duration_weeks?.toString() || "");
                          setEditMeetingDays(
                            course.sessions_per_week ? defaultDaysFromCount(course.sessions_per_week) : []
                          );
                          setEditMaxStudents(course.max_students?.toString() || "");
                          setEditStartsAt(toLocalInput(course.starts_at));
                          setEditEndsAt(toLocalInput(course.ends_at));
                          const existingEnrollments = enrollmentsByCourse.get(course.id) || [];
                          setEditSelectedStudents(existingEnrollments.map((en) => en.student_id));
                          setOpenEditCourse(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 line-clamp-3">
                      {course.description || "No description"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {stats.active}/{stats.total} active
                      </Badge>
                      {course.sessions_per_week ? (
                        <Badge variant="outline" className="border-slate-200 text-slate-700">
                          {course.sessions_per_week}x week
                        </Badge>
                      ) : null}
                      {course.max_students ? (
                        <Badge variant="outline" className="border-slate-200 text-slate-700">
                          Max {course.max_students} students
                        </Badge>
                      ) : null}
                      {days && (
                        <div className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1">
                          {days.map((d) => (
                            <span key={d} className="text-[10px] font-semibold text-slate-700">
                              {dayLabels[d]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {course.starts_at && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Starts {new Date(course.starts_at).toLocaleDateString()}
                      </p>
                    )}
                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="mt-3 inline-flex items-center text-xs font-semibold text-fuchsia-700 hover:underline"
                    >
                      View details →
                    </Link>
                  </div>
                );
              })}
              {!filteredCourses.length && (
                <div className="col-span-full rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
                  No courses yet. Create your first course to get started.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">Enrollment summary</CardTitle>
              <p className="text-xs text-slate-500">Totals by course</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-3">Course</th>
                    <th className="py-2 pr-3">Teacher</th>
                    <th className="py-2 pr-3">Active</th>
                    <th className="py-2 pr-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => {
                    const stats = courseStats.get(c.id) || { total: 0, active: 0 };
                    return (
                      <tr key={c.id} className="border-t">
                        <td className="py-2 pr-3">{c.title}</td>
                        <td className="py-2 pr-3">{c.lead_teacher_id ? teacherById.get(c.lead_teacher_id) ?? "—" : "—"}</td>
                        <td className="py-2 pr-3">{stats.active}</td>
                        <td className="py-2 pr-3">{stats.total}</td>
                      </tr>
                    );
                  })}
                  {!courses.length && (
                    <tr>
                      <td className="py-6 text-center text-slate-500" colSpan={4}>
                        No courses found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {openEditCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onMouseDown={() => setOpenEditCourse(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl rounded-2xl border bg-white p-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">
                {editCourseId ? "Edit Course" : "New Course"}
              </h3>
              <button
                aria-label="Close"
                className="h-8 w-8 rounded-md hover:bg-slate-100"
                onClick={() => setOpenEditCourse(false)}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-9 sm:col-span-2"
              />
              <Input
                placeholder="Description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="h-9 sm:col-span-2"
              />
              <Select value={editModality} onValueChange={(v: "group" | "1on1") => setEditModality(v)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Modality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="1on1">1-on-1</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={editLeadTeacher || "none"}
                onValueChange={(v) => setEditLeadTeacher(v === "none" ? null : v)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Lead teacher" />
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
              <Input
                placeholder="Course type"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="h-9"
              />
              <Input
                placeholder="Duration (weeks)"
                inputMode="numeric"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                className="h-9"
              />
              <Input
                placeholder="Sessions / week"
                inputMode="numeric"
                value={editMeetingDays.length ? editMeetingDays.length.toString() : ""}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setEditMeetingDays(defaultDaysFromCount(val));
                }}
                className="h-9"
              />
              <Input
                placeholder="Max students"
                inputMode="numeric"
                value={editMaxStudents}
                onChange={(e) => setEditMaxStudents(e.target.value)}
                className="h-9"
              />
              <Input
                type="datetime-local"
                value={editStartsAt}
                onChange={(e) => setEditStartsAt(e.target.value)}
                className="h-9"
              />
              <Input
                type="datetime-local"
                value={editEndsAt}
                onChange={(e) => setEditEndsAt(e.target.value)}
                className="h-9"
              />
              <div className="sm:col-span-2">
                <Input
                  placeholder="Search students to add"
                  value={editStudentSearch}
                  onChange={(e) => setEditStudentSearch(e.target.value)}
                  className="h-9"
                />
                <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto rounded-md border border-slate-200 p-2">
                  {students
                    .filter((s) =>
                      editStudentSearch
                        ? s.name.toLowerCase().includes(editStudentSearch.toLowerCase())
                        : true
                    )
                    .map((s) => {
                      const selected = editSelectedStudents.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setEditSelectedStudents((prev) =>
                              selected ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                            );
                          }}
                          className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                            selected
                              ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <Users className="h-3 w-3" />
                          {s.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
            {courseError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {courseError}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenEditCourse(false)}>
                Cancel
              </Button>
              <Button
                disabled={courseSaving || !editTitle.trim()}
                onClick={saveCourse}
              >
                {courseSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
