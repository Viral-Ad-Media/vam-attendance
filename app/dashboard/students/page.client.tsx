// app/dashboard/students/page.client.tsx
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Mail, Loader2 } from "lucide-react";

type Student = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  program?: string | null;
  class_name?: string | null;
  created_at?: string | null;
};

type Teacher = { id: string; name: string };
type Course = { id: string; title: string; modality: "group" | "1on1" };
type Session = { id: string; title?: string | null; starts_at: string };

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [enrollments, setEnrollments] = React.useState<any[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const [openEnroll, setOpenEnroll] = React.useState(false);
  const [enrollStudentId, setEnrollStudentId] = React.useState<string>("");
  const [enrollCourseIds, setEnrollCourseIds] = React.useState<string[]>([]);
  const [enrollCourseSearch, setEnrollCourseSearch] = React.useState("");
  const [enrollStatus, setEnrollStatus] = React.useState<"active" | "paused" | "completed" | "dropped">("active");
  const [enrollSaving, setEnrollSaving] = React.useState(false);
  const [enrollError, setEnrollError] = React.useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = React.useState<string | null>(null);
  const [openStudentModal, setOpenStudentModal] = React.useState(false);
  const [newStudentName, setNewStudentName] = React.useState("");
  const [newStudentEmail, setNewStudentEmail] = React.useState("");
  const [newStudentPhone, setNewStudentPhone] = React.useState("");
  const [newStudentCountry, setNewStudentCountry] = React.useState("");
  const [studentSaving, setStudentSaving] = React.useState(false);
  const [studentError, setStudentError] = React.useState<string | null>(null);
  const [openEditStudent, setOpenEditStudent] = React.useState(false);
  const [editStudentId, setEditStudentId] = React.useState<string | null>(null);
  const [editStudentName, setEditStudentName] = React.useState("");
  const [editStudentEmail, setEditStudentEmail] = React.useState("");
  const [editStudentPhone, setEditStudentPhone] = React.useState("");
  const [editStudentCountry, setEditStudentCountry] = React.useState("");
  const [editStudentSaving, setEditStudentSaving] = React.useState(false);
  const [editStudentError, setEditStudentError] = React.useState<string | null>(null);
  const [detailStudent, setDetailStudent] = React.useState<Student | null>(null);
  const [detailAttendance, setDetailAttendance] = React.useState<
    { id: string; session_id: string; status: string; noted_at?: string }[]
  >([]);
  const [detailEnrollments, setDetailEnrollments] = React.useState<
    { id: string; course_id: string; status: string; enrolled_at?: string }[]
  >([]);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [sRes, tRes, cRes, eRes, ssRes] = await Promise.all([
          fetch("/api/students", { cache: "no-store" }),
          fetch("/api/teachers", { cache: "no-store" }),
          fetch("/api/courses", { cache: "no-store" }),
          fetch("/api/enrollments", { cache: "no-store" }),
          fetch("/api/sessions", { cache: "no-store" }),
        ]);
        if (!sRes.ok) throw new Error(await sRes.text());
        if (!tRes.ok) throw new Error(await tRes.text());
        if (!cRes.ok) throw new Error(await cRes.text());
        if (!eRes.ok) throw new Error(await eRes.text());
        if (!ssRes.ok) throw new Error(await ssRes.text());
        const sData = (await sRes.json()) as Student[];
        const tData = (await tRes.json()) as Teacher[];
        const cData = (await cRes.json()) as Course[];
        const eData = (await eRes.json()) as any[];
        const ssData = (await ssRes.json()) as Session[];
        setStudents(sData);
        setTeachers(tData);
        setCourses(cData);
        setEnrollments(eData);
        setSessions(ssData);
        if (sData.length) {
          setEnrollStudentId(sData[0].id);
          const existing = eData.filter((e: any) => e.student_id === sData[0].id).map((e: any) => e.course_id);
          setEnrollCourseIds(existing.length ? existing : cData[0] ? [cData[0].id] : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = students.filter((s) =>
    [s.name, s.email, s.phone, s.country]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query.toLowerCase()))
  );

  // Update selected courses when student selection changes
  React.useEffect(() => {
    if (!enrollStudentId) return;
    const enrolled = enrollments
      .filter((e) => e.student_id === enrollStudentId)
      .map((e) => e.course_id);
    setEnrollCourseIds(enrolled);
  }, [enrollStudentId, enrollments]);

  React.useEffect(() => {
    if (!detailStudent) return;
    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        setDetailError(null);
        const [attRes, enRes] = await Promise.all([
          fetch(`/api/attendance?student_id=${detailStudent.id}`, { cache: "no-store" }),
          fetch(`/api/enrollments?student_id=${detailStudent.id}`, { cache: "no-store" }),
        ]);
        if (!attRes.ok) throw new Error(await attRes.text());
        if (!enRes.ok) throw new Error(await enRes.text());
        setDetailAttendance((await attRes.json()) as any[]);
        setDetailEnrollments((await enRes.json()) as any[]);
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : "Failed to load details");
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [detailStudent]);

  const saveEnrollment = async () => {
    if (!enrollStudentId || !enrollCourseIds.length) return;
    setEnrollSaving(true);
    setEnrollError(null);
    setEnrollSuccess(null);
    try {
      const payload = enrollCourseIds.map((course_id) => ({
        student_id: enrollStudentId,
        course_id,
        status: enrollStatus,
      }));
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          setEnrollError(parsed.error || parsed.message || "Failed to enroll student");
        } catch {
          setEnrollError(text || "Failed to enroll student");
        }
        return;
      }
      setEnrollSuccess("Student enrolled successfully");
      const [sRes, eRes] = await Promise.all([
        fetch("/api/students", { cache: "no-store" }),
        fetch("/api/enrollments", { cache: "no-store" }),
      ]);
      if (sRes.ok) setStudents((await sRes.json()) as Student[]);
      if (eRes.ok) setEnrollments((await eRes.json()) as any[]);
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Failed to enroll student");
    } finally {
      setEnrollSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <TopBar title="Students" subtitle="Student directory" showAccountInTitle={false} />

      {loading && (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
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
                <CardTitle className="text-sm font-semibold text-slate-800">Students</CardTitle>
                <p className="text-xs text-slate-500">Manage and enroll students into courses</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-[200px]">
                  <Select value={viewMode} onValueChange={(v: "grid" | "list") => setViewMode(v)}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="View mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="list">List view</SelectItem>
                      <SelectItem value="grid">Grid view</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Search name / email / phone / country"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-[260px]"
                />
                <Button onClick={() => setOpenStudentModal(true)}>+ Add Student</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {viewMode === "list" ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Phone</th>
                      <th className="py-2 pr-3">Program</th>
                      <th className="py-2 pr-3">Country</th>
                      <th className="py-2 pr-0 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="py-2 pr-3">{s.name}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span>{s.email ?? "—"}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3">{s.phone ?? "—"}</td>
                        <td className="py-2 pr-3">{s.program ?? "—"}</td>
                        <td className="py-2 pr-3">{s.country ?? "—"}</td>
                        <td className="py-2 pr-0 text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDetailStudent(s);
                                setOpenEnroll(true);
                              }}
                            >
                              Enroll
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditStudentId(s.id);
                                setEditStudentName(s.name);
                                setEditStudentEmail(s.email || "");
                                setEditStudentPhone(s.phone || "");
                                setEditStudentCountry(s.country || "");
                                setOpenEditStudent(true);
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length && (
                      <tr>
                        <td className="py-6 text-center text-slate-500" colSpan={6}>
                          No students found. Use “Add Student” to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((s) => (
                    <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-semibold text-fuchsia-700">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-600">{s.email ?? "—"}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600 space-y-1">
                        <p>Phone: {s.phone ?? "—"}</p>
                        <p>Program: {s.program ?? "—"}</p>
                        <p>Country: {s.country ?? "—"}</p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setDetailStudent(s);
                            setOpenEnroll(true);
                          }}
                        >
                          Enroll
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setEditStudentId(s.id);
                            setEditStudentName(s.name);
                            setEditStudentEmail(s.email || "");
                            setEditStudentPhone(s.phone || "");
                            setEditStudentCountry(s.country || "");
                            setOpenEditStudent(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!filtered.length && (
                    <div className="col-span-full rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
                      No students found. Use “Add Student” to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {openStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onMouseDown={() => setOpenStudentModal(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border bg-white p-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Add Student</h3>
              <button
                aria-label="Close"
                className="h-8 w-8 rounded-md hover:bg-slate-100"
                onClick={() => setOpenStudentModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Full name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                name="student-name"
                className="h-9"
                required
                autoComplete="name"
              />
              <Input
                type="email"
                placeholder="Email"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                name="student-email"
                className="h-9"
                required
                autoComplete="email"
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={newStudentPhone}
                onChange={(e) => setNewStudentPhone(e.target.value)}
                name="student-phone"
                className="h-9"
                required
                autoComplete="tel"
              />
              <Input
                placeholder="Country (optional)"
                value={newStudentCountry}
                onChange={(e) => setNewStudentCountry(e.target.value)}
                name="student-country"
                className="h-9"
              />
              {studentError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {studentError}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenStudentModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  studentSaving ||
                  !newStudentName.trim() ||
                  !newStudentEmail.trim() ||
                  !newStudentPhone.trim()
                }
                onClick={async () => {
                  try {
                    setStudentSaving(true);
                    setStudentError(null);
                    const res = await fetch("/api/students", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: newStudentName.trim(),
                        email: newStudentEmail.trim(),
                        phone: newStudentPhone.trim(),
                        country: newStudentCountry.trim() || undefined,
                      }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    setNewStudentName("");
                    setNewStudentEmail("");
                    setNewStudentPhone("");
                    setNewStudentCountry("");
                    setOpenStudentModal(false);
                    const sRes = await fetch("/api/students", { cache: "no-store" });
                    if (sRes.ok) setStudents((await sRes.json()) as Student[]);
                  } catch (err) {
                    setStudentError(err instanceof Error ? err.message : "Failed to create student");
                  } finally {
                    setStudentSaving(false);
                  }
                }}
              >
                {studentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {openEditStudent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onMouseDown={() => setOpenEditStudent(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border bg-white p-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Edit Student</h3>
              <button
                aria-label="Close"
                className="h-8 w-8 rounded-md hover:bg-slate-100"
                onClick={() => setOpenEditStudent(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Full name"
                value={editStudentName}
                onChange={(e) => setEditStudentName(e.target.value)}
                className="h-9"
              />
              <Input
                placeholder="Email"
                value={editStudentEmail}
                onChange={(e) => setEditStudentEmail(e.target.value)}
                className="h-9"
              />
              <Input
                placeholder="Phone"
                value={editStudentPhone}
                onChange={(e) => setEditStudentPhone(e.target.value)}
                className="h-9"
              />
              <Input
                placeholder="Country"
                value={editStudentCountry}
                onChange={(e) => setEditStudentCountry(e.target.value)}
                className="h-9"
              />
              {editStudentError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editStudentError}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenEditStudent(false)}>
                Cancel
              </Button>
              <Button
                disabled={!editStudentId || editStudentSaving}
                onClick={async () => {
                  if (!editStudentId) return;
                  try {
                    setEditStudentSaving(true);
                    setEditStudentError(null);
                    const res = await fetch(`/api/students/${editStudentId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: editStudentName.trim(),
                        email: editStudentEmail.trim() || null,
                        phone: editStudentPhone.trim() || null,
                        country: editStudentCountry.trim() || null,
                      }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    setOpenEditStudent(false);
                    const sRes = await fetch("/api/students", { cache: "no-store" });
                    if (sRes.ok) setStudents((await sRes.json()) as Student[]);
                  } catch (err) {
                    setEditStudentError(err instanceof Error ? err.message : "Failed to update student");
                  } finally {
                    setEditStudentSaving(false);
                  }
                }}
              >
                {editStudentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {openEnroll && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onMouseDown={() => setOpenEnroll(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xl rounded-2xl border bg-white p-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Enroll Student</h3>
              <button
                aria-label="Close"
                className="h-8 w-8 rounded-md hover:bg-slate-100"
                onClick={() => setOpenEnroll(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <Select value={enrollStudentId} onValueChange={setEnrollStudentId}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={enrollStatus}
                onValueChange={(v: "active" | "paused" | "completed" | "dropped") => setEnrollStatus(v)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Search courses"
                value={enrollCourseSearch}
                onChange={(e) => setEnrollCourseSearch(e.target.value)}
                className="h-9"
              />

              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 p-2">
                {courses
                  .filter((c) =>
                    enrollCourseSearch
                      ? c.title.toLowerCase().includes(enrollCourseSearch.toLowerCase())
                      : true
                  )
                  .map((c) => {
                    const selected = enrollCourseIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setEnrollCourseIds((prev) =>
                            selected ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          selected
                            ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <span>{c.title}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-[2px] text-[10px] uppercase tracking-wide">
                          {c.modality}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {enrollError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {enrollError}
                </div>
              )}
              {enrollSuccess && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {enrollSuccess}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenEnroll(false)}>
                Cancel
              </Button>
              <Button disabled={enrollSaving || !enrollStudentId || !enrollCourseIds.length} onClick={saveEnrollment}>
                {enrollSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {detailStudent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onMouseDown={() => setDetailStudent(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl rounded-2xl border bg-white p-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">{detailStudent.name}</h3>
              <button
                aria-label="Close"
                className="h-8 w-8 rounded-md hover:bg-slate-100"
                onClick={() => setDetailStudent(null)}
              >
                ✕
              </button>
            </div>
            {detailLoading && (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading details…
              </div>
            )}
            {detailError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {detailError}
              </div>
            )}
            {!detailLoading && !detailError && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">Enrollments</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {detailEnrollments.length ? (
                      detailEnrollments.map((en) => {
                        const course = courses.find((c) => c.id === en.course_id);
                        return (
                          <li key={en.id} className="flex items-center justify-between rounded-md bg-white px-2 py-1">
                            <span>{course?.title ?? "Course"}</span>
                            <span className="text-xs capitalize text-slate-500">{en.status}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-sm text-slate-500">No enrollments</li>
                    )}
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">Attendance</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {detailAttendance.length ? (
                      detailAttendance.map((att) => {
                        const session = sessions.find((s) => s.id === att.session_id);
                        return (
                          <li key={att.id} className="flex items-center justify-between rounded-md bg-white px-2 py-1">
                            <span>{session?.title ?? "Session"}</span>
                            <span className="text-xs capitalize text-slate-500">{att.status}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-sm text-slate-500">No attendance yet</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
