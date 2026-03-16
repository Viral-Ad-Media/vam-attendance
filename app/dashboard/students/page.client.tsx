// app/dashboard/students/page.client.tsx
"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { CreationChip, CreationDialog, CreationSection } from "@/components/dashboard/CreationDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Course = { id: string; title: string; modality: "group" | "1on1" };
type Session = { id: string; title?: string | null; starts_at: string };
type Enrollment = {
  id: string;
  student_id: string;
  course_id: string;
  status: "active" | "paused" | "completed" | "dropped";
  enrolled_at?: string;
};

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);
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
  const [newStudentProgram, setNewStudentProgram] = React.useState("");
  const [newStudentClassName, setNewStudentClassName] = React.useState("");
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
        const [sRes, cRes, eRes, ssRes] = await Promise.all([
          fetch("/api/students", { cache: "no-store" }),
          fetch("/api/courses", { cache: "no-store" }),
          fetch("/api/enrollments", { cache: "no-store" }),
          fetch("/api/sessions", { cache: "no-store" }),
        ]);
        if (!sRes.ok) throw new Error(await sRes.text());
        if (!cRes.ok) throw new Error(await cRes.text());
        if (!eRes.ok) throw new Error(await eRes.text());
        if (!ssRes.ok) throw new Error(await ssRes.text());
        const sData = (await sRes.json()) as Student[];
        const cData = (await cRes.json()) as Course[];
        const eData = (await eRes.json()) as Enrollment[];
        const ssData = (await ssRes.json()) as Session[];
        setStudents(sData);
        setCourses(cData);
        setEnrollments(eData);
        setSessions(ssData);
        if (sData.length) {
          setEnrollStudentId(sData[0].id);
          const existing = eData.filter((e) => e.student_id === sData[0].id).map((e) => e.course_id);
          setEnrollCourseIds(existing.length ? existing : cData[0] ? [cData[0].id] : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = students.filter((s) =>
    [s.name, s.email, s.phone, s.country]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query.toLowerCase()))
  );
  const deferredEnrollCourseSearch = React.useDeferredValue(enrollCourseSearch);
  const filteredEnrollCourses = React.useMemo(() => {
    const q = deferredEnrollCourseSearch.trim().toLowerCase();
    return courses.filter((course) => {
      if (!q) return true;
      return course.title.toLowerCase().includes(q);
    });
  }, [courses, deferredEnrollCourseSearch]);
  const selectedEnrollStudent = students.find((student) => student.id === enrollStudentId) ?? null;
  const selectedEnrollCourseNames = React.useMemo(
    () =>
      enrollCourseIds
        .map((courseId) => courses.find((course) => course.id === courseId)?.title)
        .filter((title): title is string => Boolean(title)),
    [enrollCourseIds, courses]
  );

  const openCreateStudentDialog = () => {
    setStudentError(null);
    setNewStudentName("");
    setNewStudentEmail("");
    setNewStudentPhone("");
    setNewStudentProgram("");
    setNewStudentClassName("");
    setNewStudentCountry("");
    setOpenStudentModal(true);
  };

  const openEnrollmentDialog = (studentId?: string) => {
    const resolvedStudentId = studentId ?? enrollStudentId ?? students[0]?.id ?? "";
    setEnrollError(null);
    setEnrollSuccess(null);
    setEnrollStatus("active");
    setEnrollCourseSearch("");
    setEnrollStudentId(resolvedStudentId);
    setOpenEnroll(true);
  };

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
        setDetailAttendance(
          (await attRes.json()) as { id: string; session_id: string; status: string; noted_at?: string }[]
        );
        setDetailEnrollments(
          (await enRes.json()) as { id: string; course_id: string; status: string; enrolled_at?: string }[]
        );
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : "Failed to load details");
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [detailStudent]);

  const saveEnrollment = async () => {
    if (!enrollStudentId) return;
    setEnrollSaving(true);
    setEnrollError(null);
    setEnrollSuccess(null);
    try {
      const selected = new Set(enrollCourseIds);
      const existing = enrollments.filter((e) => e.student_id === enrollStudentId);
      const toUnenroll = existing.filter((e) => !selected.has(e.course_id));

      if (enrollCourseIds.length) {
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
            setEnrollError(parsed.error || parsed.message || "Failed to update enrollments");
          } catch {
            setEnrollError(text || "Failed to update enrollments");
          }
          return;
        }
      }

      for (const en of toUnenroll) {
        const delRes = await fetch(`/api/enrollments/${en.id}`, { method: "DELETE" });
        if (!delRes.ok) {
          const text = await delRes.text();
          try {
            const parsed = JSON.parse(text);
            setEnrollError(parsed.error || parsed.message || "Failed to unenroll student");
          } catch {
            setEnrollError(text || "Failed to unenroll student");
          }
          return;
        }
      }

      if (!enrollCourseIds.length && toUnenroll.length) {
        setEnrollSuccess("Student unenrolled from all courses");
      } else if (toUnenroll.length) {
        setEnrollSuccess("Enrollments updated successfully");
      } else if (enrollCourseIds.length) {
        setEnrollSuccess("Student enrolled successfully");
      } else {
        setEnrollSuccess("No enrollment changes made");
      }

      const [sRes, eRes] = await Promise.all([
        fetch("/api/students", { cache: "no-store" }),
        fetch("/api/enrollments", { cache: "no-store" }),
      ]);
      if (sRes.ok) setStudents((await sRes.json()) as Student[]);
      if (eRes.ok) setEnrollments((await eRes.json()) as Enrollment[]);
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Failed to update enrollments");
    } finally {
      setEnrollSaving(false);
    }
  };

  const deleteStudent = async (student: Student) => {
    if (!confirm(`Delete student ${student.name}?`)) return;

    try {
      const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          throw new Error(parsed.error || parsed.message || "Failed to delete student");
        } catch {
          throw new Error(text || "Failed to delete student");
        }
      }

      const [sRes, eRes] = await Promise.all([
        fetch("/api/students", { cache: "no-store" }),
        fetch("/api/enrollments", { cache: "no-store" }),
      ]);
      if (sRes.ok) setStudents((await sRes.json()) as Student[]);
      if (eRes.ok) setEnrollments((await eRes.json()) as Enrollment[]);
      if (detailStudent?.id === student.id) setDetailStudent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete student");
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
                <Button onClick={openCreateStudentDialog}>+ Add Student</Button>
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
                                openEnrollmentDialog(s.id);
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => deleteStudent(s)}
                            >
                              Delete
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
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
                            openEnrollmentDialog(s.id);
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 hover:bg-red-50"
                          onClick={() => deleteStudent(s)}
                        >
                          Delete
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

      <CreationDialog
        open={openStudentModal}
        onOpenChange={setOpenStudentModal}
        icon={GraduationCap}
        eyebrow="Student Onboarding"
        title="Add a polished student profile"
        description="Capture the essentials once so enrollment, attendance, and reporting stay clean from day one."
        accent="emerald"
        className="sm:max-w-4xl"
        stats={[
          { label: "Primary contact", value: newStudentEmail.trim() || "Awaiting email", hint: "Main communication channel" },
          { label: "Program", value: newStudentProgram.trim() || "Not set", hint: "Optional learning track" },
          { label: "Region", value: newStudentCountry.trim() || "Not set", hint: "Useful for scheduling and support" },
        ]}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
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
                      program: newStudentProgram.trim() || undefined,
                      class_name: newStudentClassName.trim() || undefined,
                    }),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  setNewStudentName("");
                  setNewStudentEmail("");
                  setNewStudentPhone("");
                  setNewStudentProgram("");
                  setNewStudentClassName("");
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
              {studentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Student"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <CreationSection
              eyebrow="Contact"
              title="Student identity"
              description="Use the same details your team will rely on for attendance reminders and follow-up."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="student-name">Full name</Label>
                  <Input
                    id="student-name"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    name="student-name"
                    className="mt-2 h-11 bg-white"
                    autoComplete="name"
                    placeholder="Amina Johnson"
                  />
                </div>
                <div>
                  <Label htmlFor="student-email">Email</Label>
                  <Input
                    id="student-email"
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    name="student-email"
                    className="mt-2 h-11 bg-white"
                    autoComplete="email"
                    placeholder="amina@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="student-phone">Phone</Label>
                  <Input
                    id="student-phone"
                    type="tel"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    name="student-phone"
                    className="mt-2 h-11 bg-white"
                    autoComplete="tel"
                    placeholder="+1 555 123 4567"
                  />
                </div>
              </div>
            </CreationSection>

            <CreationSection
              eyebrow="Profile"
              title="Optional academic context"
              description="Adding this now makes filtering and downstream enrollment assignment easier later."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="student-program">Program</Label>
                  <Input
                    id="student-program"
                    placeholder="SAT Intensive"
                    value={newStudentProgram}
                    onChange={(e) => setNewStudentProgram(e.target.value)}
                    className="mt-2 h-11 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="student-class">Cohort / class</Label>
                  <Input
                    id="student-class"
                    placeholder="Weekend A"
                    value={newStudentClassName}
                    onChange={(e) => setNewStudentClassName(e.target.value)}
                    className="mt-2 h-11 bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="student-country">Country</Label>
                  <Input
                    id="student-country"
                    placeholder="Nigeria"
                    value={newStudentCountry}
                    onChange={(e) => setNewStudentCountry(e.target.value)}
                    name="student-country"
                    className="mt-2 h-11 bg-white"
                  />
                </div>
              </div>
            </CreationSection>
          </div>

          <CreationSection
            eyebrow="Preview"
            title="Profile snapshot"
            description="A quick read on how this student will appear across the dashboard."
          >
            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-lg font-semibold text-white">
                  {(newStudentName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2) || "ST").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {newStudentName.trim() || "Student name"}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {newStudentEmail.trim() || "Email will appear here"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {newStudentProgram.trim() ? <CreationChip accent="emerald">{newStudentProgram.trim()}</CreationChip> : null}
                {newStudentClassName.trim() ? <CreationChip accent="sky">{newStudentClassName.trim()}</CreationChip> : null}
                {newStudentCountry.trim() ? <CreationChip accent="amber">{newStudentCountry.trim()}</CreationChip> : null}
                {!newStudentProgram.trim() && !newStudentClassName.trim() && !newStudentCountry.trim() ? (
                  <p className="text-xs text-slate-500">Add profile context to make this student easier to sort later.</p>
                ) : null}
              </div>
              <div className="mt-5 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <p>Phone: {newStudentPhone.trim() || "Not added yet"}</p>
                <p>Program: {newStudentProgram.trim() || "Not assigned"}</p>
                <p>Cohort: {newStudentClassName.trim() || "Not assigned"}</p>
              </div>
            </div>
          </CreationSection>
        </div>

        {studentError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {studentError}
          </div>
        )}
      </CreationDialog>

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

      <CreationDialog
        open={openEnroll}
        onOpenChange={setOpenEnroll}
        icon={GraduationCap}
        eyebrow="Enrollment Studio"
        title="Shape this student's active enrollments"
        description="Choose the courses to keep active, update their status, and remove anything that should no longer stay on the roster."
        accent="amber"
        className="sm:max-w-5xl"
        stats={[
          {
            label: "Student",
            value: selectedEnrollStudent?.name || "Select a student",
            hint: selectedEnrollStudent?.email || "Choose who you are updating",
          },
          { label: "Selected courses", value: `${enrollCourseIds.length}`, hint: "Courses that will remain enrolled" },
          { label: "Status", value: enrollStatus, hint: "Applied to selected enrollments" },
        ]}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenEnroll(false)}>
              Cancel
            </Button>
            <Button disabled={enrollSaving || !enrollStudentId} onClick={saveEnrollment}>
              {enrollSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Enrollment Changes"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <CreationSection
              eyebrow="Owner"
              title="Choose the student"
              description="Swap students without leaving the dialog when you are processing several updates in a row."
            >
              <Label>Student</Label>
              <Select value={enrollStudentId} onValueChange={setEnrollStudentId}>
                <SelectTrigger className="mt-2 h-11 w-full bg-white">
                  <SelectValue placeholder="Student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{selectedEnrollStudent?.name || "Student not selected"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedEnrollStudent?.email || "Select a student to see their details here."}
                </p>
                {selectedEnrollStudent?.program ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CreationChip accent="emerald">{selectedEnrollStudent.program}</CreationChip>
                    {selectedEnrollStudent.class_name ? (
                      <CreationChip accent="sky">{selectedEnrollStudent.class_name}</CreationChip>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CreationSection>

            <CreationSection
              eyebrow="Status"
              title="Set the enrollment state"
              description="This status will apply to each selected course when you save."
            >
              <Label>Status</Label>
              <Select
                value={enrollStatus}
                onValueChange={(value: "active" | "paused" | "completed" | "dropped") => setEnrollStatus(value)}
              >
                <SelectTrigger className="mt-2 h-11 w-full bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Unselect a course below to remove the student from it entirely.
              </p>
            </CreationSection>
          </div>

          <div className="space-y-4">
            <CreationSection
              eyebrow="Course Picker"
              title="Keep the right courses active"
              description="Search and toggle the courses this student should stay enrolled in."
              badge={`${enrollCourseIds.length} selected`}
            >
              <Label htmlFor="enroll-course-search">Search courses</Label>
              <Input
                id="enroll-course-search"
                placeholder="Search course title"
                value={enrollCourseSearch}
                onChange={(e) => setEnrollCourseSearch(e.target.value)}
                className="mt-2 h-11 bg-white"
              />
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                {filteredEnrollCourses.length ? (
                  filteredEnrollCourses.map((course) => {
                    const selected = enrollCourseIds.includes(course.id);
                    return (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => {
                          setEnrollCourseIds((prev) =>
                            selected ? prev.filter((id) => id !== course.id) : [...prev, course.id]
                          );
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                          selected
                            ? "border-amber-300 bg-amber-50 shadow-[0_12px_24px_-20px_rgba(245,158,11,0.8)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{course.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {selected ? "Selected to remain enrolled" : "Tap to include this course"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreationChip accent={selected ? "amber" : "sky"}>
                            {course.modality === "group" ? "Group" : "1-on-1"}
                          </CreationChip>
                          <CreationChip accent={selected ? "emerald" : "sky"} className={!selected ? "border-slate-200 bg-slate-100 text-slate-600" : ""}>
                            {selected ? "Selected" : "Available"}
                          </CreationChip>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    No courses match that search.
                  </div>
                )}
              </div>
            </CreationSection>

            <CreationSection
              eyebrow="Preview"
              title="Enrollment summary"
              description="A quick view of what will stay on the student's schedule."
            >
              <div className="flex flex-wrap gap-2">
                {selectedEnrollCourseNames.length ? (
                  selectedEnrollCourseNames.map((courseName) => (
                    <CreationChip key={courseName} accent="amber">
                      {courseName}
                    </CreationChip>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No courses selected yet. Saving with none selected will remove all enrollments.</p>
                )}
              </div>
            </CreationSection>
          </div>
        </div>

        {enrollError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {enrollError}
          </div>
        )}
        {enrollSuccess && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {enrollSuccess}
          </div>
        )}
      </CreationDialog>

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
