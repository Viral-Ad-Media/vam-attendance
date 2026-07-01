// app/dashboard/teachers/page.client.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/dashboard/TopBar";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { CreationDialog, CreationSection } from "@/components/dashboard/CreationDialog";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Users, Mail, Loader2, Pencil, Trash2, Plus, X, UserPlus } from "lucide-react";

type Teacher = {
  id: string;
  name: string;
  email: string;
  created_at?: string | null;
};
type Student = { id: string; name: string };
type TeacherMutationResponse = {
  setup_email_sent?: boolean;
  setup_email_error?: string | null;
  error?: string;
  message?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [query, setQuery] = React.useState("");
  const [teacherPage, setTeacherPage] = React.useState(1);
  const [teacherPageSize, setTeacherPageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [openCourse, setOpenCourse] = React.useState(false);
  const [courseTitle, setCourseTitle] = React.useState("");
  const [courseModality, setCourseModality] = React.useState<"group" | "1on1">("group");
  const [courseLeadTeacher, setCourseLeadTeacher] = React.useState<string>("");
  const [courseMaxStudents, setCourseMaxStudents] = React.useState<string>("");
  const [courseType, setCourseType] = React.useState("");
  const [courseDuration, setCourseDuration] = React.useState("");
  const [courseMeetingDays, setCourseMeetingDays] = React.useState<number[]>([]);
  const [courseStartsAt, setCourseStartsAt] = React.useState("");
  const [courseSaving, setCourseSaving] = React.useState(false);
  const [courseError, setCourseError] = React.useState<string | null>(null);
  const [courseSuccess, setCourseSuccess] = React.useState<string | null>(null);
  const [courseStudentSearch, setCourseStudentSearch] = React.useState("");
  const [courseSelectedStudents, setCourseSelectedStudents] = React.useState<string[]>([]);
  const [openTeacherModal, setOpenTeacherModal] = React.useState(false);
  const [newTeacherName, setNewTeacherName] = React.useState("");
  const [newTeacherEmail, setNewTeacherEmail] = React.useState("");
  const [newTeacherPassword, setNewTeacherPassword] = React.useState("");
  const [sendTeacherSetupLink, setSendTeacherSetupLink] = React.useState(true);
  const [teacherSaving, setTeacherSaving] = React.useState(false);
  const [teacherError, setTeacherError] = React.useState<string | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = React.useState<string[]>([]);
  const [bulkTeacherSaving, setBulkTeacherSaving] = React.useState(false);
  const [bulkTeacherError, setBulkTeacherError] = React.useState<string | null>(null);
  const [bulkTeacherSuccess, setBulkTeacherSuccess] = React.useState<string | null>(null);
  const [teacherSuccess, setTeacherSuccess] = React.useState<string | null>(null);
  const [openEditTeacher, setOpenEditTeacher] = React.useState(false);
  const [editTeacherId, setEditTeacherId] = React.useState<string | null>(null);
  const [editTeacherName, setEditTeacherName] = React.useState("");
  const [editTeacherEmail, setEditTeacherEmail] = React.useState("");
  const [editTeacherSendSetup, setEditTeacherSendSetup] = React.useState(false);
  const [editTeacherPassword, setEditTeacherPassword] = React.useState("");
  const [editTeacherPasswordConfirm, setEditTeacherPasswordConfirm] = React.useState("");
  const [editTeacherSaving, setEditTeacherSaving] = React.useState(false);
  const [editTeacherError, setEditTeacherError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [tRes, sRes] = await Promise.all([
          fetch("/api/teachers", { cache: "no-store" }),
          fetch("/api/students", { cache: "no-store" }),
        ]);
        if (!tRes.ok) throw new Error(await tRes.text());
        if (!sRes.ok) throw new Error(await sRes.text());
        const data = (await tRes.json()) as Teacher[];
        const sData = (await sRes.json()) as Student[];
        setTeachers(data);
        setStudents(sData);
        setCourseLeadTeacher((current) => current || data[0]?.id || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load teachers");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = React.useMemo(
    () =>
      teachers.filter((t) =>
        [t.name, t.email]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query.toLowerCase()))
      ),
    [teachers, query]
  );
  const teacherTotalPages = Math.max(1, Math.ceil(filtered.length / teacherPageSize));
  React.useEffect(() => {
    setTeacherPage((currentPage) => Math.min(currentPage, teacherTotalPages));
  }, [teacherTotalPages]);
  const paginatedTeachers = React.useMemo(() => {
    const start = (teacherPage - 1) * teacherPageSize;
    return filtered.slice(start, start + teacherPageSize);
  }, [filtered, teacherPage, teacherPageSize]);
  const visibleTeacherIds = React.useMemo(
    () => paginatedTeachers.map((teacher) => teacher.id),
    [paginatedTeachers]
  );
  const visibleTeacherIdSet = React.useMemo(
    () => new Set(visibleTeacherIds),
    [visibleTeacherIds]
  );
  const selectedTeacherCount = selectedTeacherIds.length;
  const selectedVisibleTeacherCount = visibleTeacherIds.filter((id) =>
    selectedTeacherIds.includes(id)
  ).length;
  const allVisibleTeachersSelected =
    visibleTeacherIds.length > 0 && selectedVisibleTeacherCount === visibleTeacherIds.length;
  const editTeacherPasswordRequested = editTeacherPassword.trim().length > 0 || editTeacherPasswordConfirm.trim().length > 0;
  const editTeacherPasswordError = React.useMemo(() => {
    if (!editTeacherPasswordRequested) return null;
    if (editTeacherPassword.trim().length < 8) return "Password must be at least 8 characters.";
    if (editTeacherPassword !== editTeacherPasswordConfirm) return "Passwords do not match.";
    return null;
  }, [editTeacherPassword, editTeacherPasswordConfirm, editTeacherPasswordRequested]);

  React.useEffect(() => {
    const currentIds = new Set(teachers.map((teacher) => teacher.id));
    setSelectedTeacherIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [teachers]);

  const toggleTeacherSelection = (id: string, checked: boolean) => {
    setBulkTeacherError(null);
    setBulkTeacherSuccess(null);
    setSelectedTeacherIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((existingId) => existingId !== id);
    });
  };

  const toggleVisibleTeacherSelection = (checked: boolean) => {
    setBulkTeacherError(null);
    setBulkTeacherSuccess(null);
    setSelectedTeacherIds((prev) => {
      if (!checked) return prev.filter((id) => !visibleTeacherIdSet.has(id));
      return Array.from(new Set([...prev, ...visibleTeacherIds]));
    });
  };

  const clearTeacherSelection = () => {
    setSelectedTeacherIds([]);
    setBulkTeacherError(null);
    setBulkTeacherSuccess(null);
  };

  const refreshTeachers = async () => {
    const tRes = await fetch("/api/teachers", { cache: "no-store" });
    if (!tRes.ok) throw new Error(await tRes.text());
    setTeachers((await tRes.json()) as Teacher[]);
  };

  const resetTeacherCreateForm = () => {
    setNewTeacherName("");
    setNewTeacherEmail("");
    setNewTeacherPassword("");
    setSendTeacherSetupLink(true);
    setTeacherError(null);
  };

  const openTeacherCreateForm = () => {
    setTeacherSuccess(null);
    resetTeacherCreateForm();
    setOpenTeacherModal(true);
  };

  const closeTeacherCreateForm = () => {
    if (teacherSaving) return;
    setOpenTeacherModal(false);
    setTeacherError(null);
  };

  const openTeacherEditForm = (teacher: Teacher) => {
    setTeacherSuccess(null);
    setEditTeacherId(teacher.id);
    setEditTeacherName(teacher.name);
    setEditTeacherEmail(teacher.email);
    setEditTeacherSendSetup(false);
    setEditTeacherPassword("");
    setEditTeacherPasswordConfirm("");
    setEditTeacherError(null);
    setOpenEditTeacher(true);
  };

  const closeTeacherEditForm = () => {
    if (editTeacherSaving) return;
    setOpenEditTeacher(false);
    setEditTeacherId(null);
    setEditTeacherName("");
    setEditTeacherEmail("");
    setEditTeacherSendSetup(false);
    setEditTeacherPassword("");
    setEditTeacherPasswordConfirm("");
    setEditTeacherError(null);
  };

  const deleteTeacherById = async (teacherId: string) => {
    const res = await fetch(`/api/teachers/${teacherId}`, { method: "DELETE" });
    if (!res.ok) {
      const text = await res.text();
      try {
        const parsed = JSON.parse(text) as { error?: string; message?: string };
        throw new Error(parsed.error || parsed.message || "Failed to delete teacher");
      } catch {
        throw new Error(text || "Failed to delete teacher");
      }
    }
  };

  const deleteTeacher = async (teacher: Teacher) => {
    if (!confirm(`Delete teacher ${teacher.name}?`)) return;

    try {
      await deleteTeacherById(teacher.id);
      await refreshTeachers();
      if (selectedTeacherIds.includes(teacher.id)) {
        setSelectedTeacherIds((prev) => prev.filter((id) => id !== teacher.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete teacher");
    }
  };

  const bulkDeleteTeachers = async () => {
    if (!selectedTeacherIds.length) return;
    const count = selectedTeacherIds.length;
    if (!confirm(`Delete ${count} selected teacher${count === 1 ? "" : "s"}?`)) return;

    setBulkTeacherSaving(true);
    setBulkTeacherError(null);
    setBulkTeacherSuccess(null);
    try {
      await Promise.all(selectedTeacherIds.map((teacherId) => deleteTeacherById(teacherId)));
      await refreshTeachers();
      setSelectedTeacherIds([]);
      setBulkTeacherSuccess(`Deleted ${count} teacher${count === 1 ? "" : "s"}.`);
    } catch (err) {
      setBulkTeacherError(err instanceof Error ? err.message : "Failed to delete selected teachers");
    } finally {
      setBulkTeacherSaving(false);
    }
  };

  const saveTeacherCreateForm = async () => {
    try {
      setTeacherSaving(true);
      setTeacherError(null);
      setTeacherSuccess(null);
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeacherName.trim(),
          email: newTeacherEmail.trim(),
          ...(newTeacherPassword.trim().length ? { password: newTeacherPassword.trim() } : {}),
          sendPasswordSetup: sendTeacherSetupLink,
        }),
      });
      const data = (await res.json()) as TeacherMutationResponse;
      if (!res.ok) throw new Error(data.error || "Failed to create teacher");
      await refreshTeachers();
      resetTeacherCreateForm();
      setOpenTeacherModal(false);
      if (data.setup_email_sent) {
        setTeacherSuccess("Teacher created and password setup email sent.");
      } else if (sendTeacherSetupLink) {
        setTeacherSuccess(
          `Teacher created. Setup email could not be sent${data.setup_email_error ? `: ${data.setup_email_error}` : "."}`
        );
      } else {
        setTeacherSuccess("Teacher created.");
      }
    } catch (err) {
      setTeacherError(err instanceof Error ? err.message : "Failed to create teacher");
    } finally {
      setTeacherSaving(false);
    }
  };

  const saveTeacherEditForm = async () => {
    if (!editTeacherId) return;
    if (editTeacherPasswordError) {
      setEditTeacherError(editTeacherPasswordError);
      return;
    }
    try {
      setEditTeacherSaving(true);
      setEditTeacherError(null);
      setTeacherSuccess(null);
      const password = editTeacherPassword.trim();
      const res = await fetch(`/api/teachers/${editTeacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editTeacherName.trim(),
          email: editTeacherEmail.trim(),
          ...(password ? { password } : {}),
          sendPasswordSetup: password ? false : editTeacherSendSetup,
        }),
      });
      const data = (await res.json()) as TeacherMutationResponse;
      if (!res.ok) throw new Error(data.error || "Failed to update teacher");
      await refreshTeachers();
      closeTeacherEditForm();
      if (password) {
        setTeacherSuccess("Teacher updated and password changed.");
      } else if (data.setup_email_sent) {
        setTeacherSuccess("Teacher updated and password setup email sent.");
      } else if (editTeacherSendSetup) {
        setTeacherSuccess(
          `Teacher updated. Setup email could not be sent${data.setup_email_error ? `: ${data.setup_email_error}` : "."}`
        );
      } else {
        setTeacherSuccess("Teacher updated.");
      }
    } catch (err) {
      setEditTeacherError(err instanceof Error ? err.message : "Failed to update teacher");
    } finally {
      setEditTeacherSaving(false);
    }
  };

  const openTeacherProfile = (teacherId: string) => {
    router.push(`/dashboard/teachers/${teacherId}`);
  };

  const editingTeacher = React.useMemo(
    () => teachers.find((teacher) => teacher.id === editTeacherId) ?? null,
    [editTeacherId, teachers]
  );

  return (
    <div className="space-y-4">
      <TopBar title="Teachers" subtitle="Manage your team" showAccountInTitle={false} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Teacher Directory</CardTitle>
            <p className="text-sm text-slate-600">View all instructors in your organization.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                className="px-3"
                onClick={() => setViewMode("grid")}
              >
                Grid
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                className="px-3"
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
            </div>
            <Input
              placeholder="Search teachers..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setTeacherPage(1);
              }}
              className="w-56"
            />
            <Button variant="secondary" onClick={() => setOpenCourse(true)}>
              <Plus className="h-4 w-4" />
              Add Course
            </Button>
            <Button
              onClick={openTeacherCreateForm}
            >
              <Plus className="h-4 w-4" />
              Add Teacher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading teachers...
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {selectedTeacherCount ? `${selectedTeacherCount} selected` : "Bulk actions"}
                </p>
                <p className="text-xs text-slate-500">
                  Select teachers across the current page and remove them together.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Checkbox
                    checked={allVisibleTeachersSelected}
                    disabled={!visibleTeacherIds.length || bulkTeacherSaving}
                    onCheckedChange={toggleVisibleTeacherSelection}
                  />
                  Visible
                </label>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={clearTeacherSelection}
                  disabled={!selectedTeacherCount || bulkTeacherSaving}
                  title="Clear selection"
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={bulkDeleteTeachers}
                  disabled={!selectedTeacherCount || bulkTeacherSaving}
                  title="Delete selected teachers"
                  aria-label="Delete selected teachers"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {bulkTeacherError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {bulkTeacherError}
            </div>
          )}
          {bulkTeacherSuccess && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {bulkTeacherSuccess}
            </div>
          )}
          {teacherSuccess && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {teacherSuccess}
            </div>
          )}
          {!loading && !error && viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {paginatedTeachers.map((t) => (
                <div
                  key={t.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => openTeacherProfile(t.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openTeacherProfile(t.id);
                    }
                  }}
                  className={`group relative rounded-lg border bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                    selectedTeacherIds.includes(t.id) ? "border-primary/30 ring-1 ring-primary/20" : "border-slate-200"
                  } cursor-pointer`}
                >
                  <div className="absolute right-3 top-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTeacherIds.includes(t.id)}
                      disabled={bulkTeacherSaving}
                      aria-label={`Select teacher ${t.name}`}
                      onCheckedChange={(checked) => toggleTeacherSelection(t.id, checked)}
                    />
                  </div>
                  <div className="flex items-center gap-3 pr-10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-600">{t.email}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => openTeacherEditForm(t)}
                      title="Edit teacher"
                      aria-label="Edit teacher"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteTeacher(t)}
                      title="Delete teacher"
                      aria-label="Delete teacher"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!filtered.length && (
                <div className="col-span-full rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
                  No teachers yet. Add a teacher to get started.
                </div>
              )}
            </div>
          )}

          {!loading && !error && viewMode === "list" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="w-10 py-2 pr-3">
                    <Checkbox
                      checked={allVisibleTeachersSelected}
                      disabled={!visibleTeacherIds.length || bulkTeacherSaving}
                      aria-label="Select visible teachers"
                      onCheckedChange={toggleVisibleTeacherSelection}
                    />
                  </th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-0 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTeachers.map((t) => (
                  <tr
                    key={t.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => openTeacherProfile(t.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openTeacherProfile(t.id);
                      }
                    }}
                    className={`border-t transition hover:bg-slate-50 ${
                      selectedTeacherIds.includes(t.id) ? "bg-primary/5" : ""
                    } cursor-pointer`}
                  >
                    <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedTeacherIds.includes(t.id)}
                        disabled={bulkTeacherSaving}
                        aria-label={`Select teacher ${t.name}`}
                        onCheckedChange={(checked) => toggleTeacherSelection(t.id, checked)}
                      />
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-900">{t.name}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{t.email}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-0 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openTeacherEditForm(t)}
                          title="Edit teacher"
                          aria-label="Edit teacher"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => deleteTeacher(t)}
                          title="Delete teacher"
                          aria-label="Delete teacher"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td className="py-6 text-center text-slate-500" colSpan={4}>
                      No teachers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {!loading && !error && filtered.length > 0 && (
            <PaginationControls
              page={teacherPage}
              pageSize={teacherPageSize}
              totalItems={filtered.length}
              itemLabel="teachers"
              onPageChange={setTeacherPage}
              onPageSizeChange={(pageSize) => {
                setTeacherPageSize(pageSize);
                setTeacherPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {openCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onMouseDown={() => setOpenCourse(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl rounded-lg border bg-white p-4 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Add Course</h3>
              <button
                aria-label="Close"
                className="h-8 w-8 rounded-md hover:bg-slate-100"
                onClick={() => setOpenCourse(false)}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Course title"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="h-9 sm:col-span-2"
              />
              <Select
                value={courseModality}
                onValueChange={(v: "group" | "1on1") => setCourseModality(v)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Modality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="1on1">1-on-1</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={courseLeadTeacher}
                onValueChange={setCourseLeadTeacher}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Lead teacher" />
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
                placeholder="Course type"
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
                className="h-9"
              />
              <Input
                placeholder="Duration (weeks)"
                inputMode="numeric"
                value={courseDuration}
                onChange={(e) => setCourseDuration(e.target.value)}
                className="h-9"
              />
              <Input
                placeholder="Sessions / week"
                inputMode="numeric"
                value={courseMeetingDays.length ? courseMeetingDays.length.toString() : ""}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  const order = [1, 3, 5, 2, 4, 0, 6];
                  setCourseMeetingDays(order.slice(0, Math.min(val, 7)));
                }}
                className="h-9"
              />
              <Input
                placeholder="Max students"
                inputMode="numeric"
                value={courseMaxStudents}
                onChange={(e) => setCourseMaxStudents(e.target.value)}
                className="h-9"
              />
              <Input
                type="datetime-local"
                value={courseStartsAt}
                onChange={(e) => setCourseStartsAt(e.target.value)}
                className="h-9 sm:col-span-2"
              />
              <Input
                placeholder="Search students to add"
                value={courseStudentSearch}
                onChange={(e) => setCourseStudentSearch(e.target.value)}
                className="h-9 sm:col-span-2"
              />
              <div className="sm:col-span-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto rounded-md border border-slate-200 p-2">
                {students
                  .filter((s) =>
                    courseStudentSearch
                      ? s.name.toLowerCase().includes(courseStudentSearch.toLowerCase())
                      : true
                  )
                  .map((s) => {
                    const selected = courseSelectedStudents.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setCourseSelectedStudents((prev) =>
                            selected ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          );
                        }}
                        className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                          selected
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
              </div>
            </div>
            {courseError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {courseError}
              </div>
            )}
            {courseSuccess && (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {courseSuccess}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenCourse(false)}>
                Cancel
              </Button>
              <Button
                disabled={courseSaving || !courseTitle.trim()}
                onClick={async () => {
                  try {
                    setCourseSaving(true);
                    setCourseError(null);
                    setCourseSuccess(null);
                    const payload: {
                      title: string;
                      modality: "group" | "1on1";
                      lead_teacher_id: string | null;
                      course_type: string | null;
                      duration_weeks: number | null;
                      sessions_per_week: number | null;
                      meeting_days?: number[];
                      max_students: number | null;
                      starts_at: string | null;
                    } = {
                      title: courseTitle.trim(),
                      modality: courseModality,
                      lead_teacher_id: courseLeadTeacher || null,
                      course_type: courseType.trim() || null,
                      duration_weeks: courseDuration ? Number(courseDuration) : null,
                      sessions_per_week: courseMeetingDays.length ? courseMeetingDays.length : null,
                      meeting_days: courseMeetingDays.length ? courseMeetingDays : undefined,
                      max_students: courseMaxStudents ? Number(courseMaxStudents) : null,
                      starts_at: courseStartsAt ? new Date(courseStartsAt).toISOString() : null,
                    };
                    const res = await fetch("/api/courses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const createdCourse = (await res.json()) as { id: string };

                    if (courseSelectedStudents.length) {
                      const enrollRes = await fetch("/api/enrollments", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(
                          courseSelectedStudents.map((studentId) => ({
                            student_id: studentId,
                            course_id: createdCourse.id,
                            teacher_id: courseLeadTeacher || null,
                            status: "active" as const,
                          }))
                        ),
                      });
                      if (!enrollRes.ok) throw new Error(await enrollRes.text());
                    }

                    setCourseSuccess("Course created");
                    setCourseTitle("");
                    setCourseType("");
                    setCourseDuration("");
                    setCourseMeetingDays([]);
                    setCourseMaxStudents("");
                    setCourseStartsAt("");
                    setCourseSelectedStudents([]);
                  } catch (err) {
                    setCourseError(err instanceof Error ? err.message : "Failed to create course");
                  } finally {
                    setCourseSaving(false);
                  }
                }}
              >
                {courseSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CreationDialog
        open={openTeacherModal}
        onOpenChange={(open) => {
          if (!open) closeTeacherCreateForm();
        }}
        icon={UserPlus}
        eyebrow="Teachers"
        title="Add Teacher"
        description="Create a new instructor account, choose how access is delivered, and keep the directory ready from the start."
        stats={[
          {
            label: "Teachers",
            value: String(teachers.length),
            hint: "Current team size",
          },
          {
            label: "Invite mode",
            value: sendTeacherSetupLink ? "Setup email" : "Password only",
            hint: sendTeacherSetupLink
              ? "Teacher gets a setup link by email"
              : "You will set the password now",
          },
        ]}
        footer={
          <>
            <Button variant="outline" onClick={closeTeacherCreateForm} disabled={teacherSaving}>
              Cancel
            </Button>
            <Button
              disabled={
                teacherSaving ||
                !newTeacherName.trim() ||
                !newTeacherEmail.trim() ||
                (newTeacherPassword.trim().length > 0 && newTeacherPassword.trim().length < 8) ||
                (!sendTeacherSetupLink && newTeacherPassword.trim().length === 0)
              }
              onClick={saveTeacherCreateForm}
            >
              {teacherSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Teacher"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <CreationSection
            eyebrow="Identity"
            title="Teacher profile"
            description="These details will appear in the directory and on the teacher profile page."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="teacher-create-name">Full name</Label>
                <Input
                  id="teacher-create-name"
                  placeholder="Amina Johnson"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="mt-2 h-11 bg-white"
                  autoComplete="name"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="teacher-create-email">Email</Label>
                <Input
                  id="teacher-create-email"
                  type="email"
                  placeholder="amina@example.com"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="mt-2 h-11 bg-white"
                  autoComplete="email"
                />
              </div>
            </div>
          </CreationSection>

          <CreationSection
            eyebrow="Access"
            title="Login setup"
            description="Choose whether the teacher receives a setup link or a temporary password."
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="teacher-create-password">Temporary password</Label>
                <Input
                  id="teacher-create-password"
                  type="password"
                  placeholder="Optional password (min 8 chars)"
                  value={newTeacherPassword}
                  onChange={(e) => setNewTeacherPassword(e.target.value)}
                  className="mt-2 h-11 bg-white"
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="teacher-create-setup"
                    checked={sendTeacherSetupLink}
                    onCheckedChange={(checked) => setSendTeacherSetupLink(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="teacher-create-setup" className="text-sm font-medium text-slate-900">
                      Send password setup email
                    </Label>
                    <p className="text-xs leading-5 text-slate-500">
                      Recommended if you want the teacher to finish signing in from email.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Leave the password blank if you want the setup email to handle access.
              </p>
            </div>
          </CreationSection>

          {teacherError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {teacherError}
            </div>
          )}
        </div>
      </CreationDialog>

      <CreationDialog
        open={openEditTeacher}
        onOpenChange={(open) => {
          if (!open) closeTeacherEditForm();
        }}
        icon={Pencil}
        eyebrow="Teacher profile"
        title="Edit Teacher"
        description="Update the teacher's name or email and optionally resend a setup link."
        stats={[
          {
            label: "Joined",
            value: formatDate(editingTeacher?.created_at),
            hint: "Original profile record",
          },
          {
            label: "Email",
            value: editTeacherEmail || "Not set",
            hint: "Login address",
          },
        ]}
        footer={
          <>
            <Button variant="outline" onClick={closeTeacherEditForm} disabled={editTeacherSaving}>
              Cancel
            </Button>
              <Button
                disabled={
                  !editTeacherId ||
                  editTeacherSaving ||
                  !editTeacherName.trim() ||
                  !editTeacherEmail.trim() ||
                  Boolean(editTeacherPasswordError)
                }
                onClick={saveTeacherEditForm}
              >
                {editTeacherSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <CreationSection
            eyebrow="Identity"
            title="Profile details"
            description="These values are synced to the teacher account and the auth profile."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="teacher-edit-name">Full name</Label>
                <Input
                  id="teacher-edit-name"
                  placeholder="Amina Johnson"
                  value={editTeacherName}
                  onChange={(e) => setEditTeacherName(e.target.value)}
                  className="mt-2 h-11 bg-white"
                  autoComplete="name"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="teacher-edit-email">Email</Label>
                <Input
                  id="teacher-edit-email"
                  type="email"
                  placeholder="amina@example.com"
                  value={editTeacherEmail}
                  onChange={(e) => setEditTeacherEmail(e.target.value)}
                  className="mt-2 h-11 bg-white"
                  autoComplete="email"
                />
              </div>
            </div>
          </CreationSection>

          <CreationSection
            eyebrow="Password"
            title="Set or change password"
            description="Leave both fields blank to keep the current password."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="teacher-edit-password">New password</Label>
                <Input
                  id="teacher-edit-password"
                  type="password"
                  placeholder="Optional new password"
                  value={editTeacherPassword}
                  onChange={(e) => setEditTeacherPassword(e.target.value)}
                  className="mt-2 h-11 bg-white"
                  autoComplete="new-password"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="teacher-edit-password-confirm">Confirm new password</Label>
                <Input
                  id="teacher-edit-password-confirm"
                  type="password"
                  placeholder="Repeat the new password"
                  value={editTeacherPasswordConfirm}
                  onChange={(e) => setEditTeacherPasswordConfirm(e.target.value)}
                  className="mt-2 h-11 bg-white"
                  autoComplete="new-password"
                />
              </div>
            </div>
            {editTeacherPasswordError && (
              <p className="mt-3 text-xs font-medium text-red-600">{editTeacherPasswordError}</p>
            )}
          </CreationSection>

          <CreationSection
            eyebrow="Access"
            title="Password setup"
            description="You can resend the setup email after saving if the teacher needs a fresh invite."
          >
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="teacher-edit-setup"
                  checked={editTeacherPasswordRequested ? false : editTeacherSendSetup}
                  disabled={editTeacherPasswordRequested}
                  onCheckedChange={(checked) => setEditTeacherSendSetup(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="teacher-edit-setup" className="text-sm font-medium text-slate-900">
                    Send password setup email after save
                  </Label>
                  <p className="text-xs leading-5 text-slate-500">
                    Use this when the teacher needs a new login link after you change their profile.
                    {editTeacherPasswordRequested ? " Disabled while a new password is being set." : ""}
                  </p>
                </div>
              </div>
            </div>
          </CreationSection>

          {editTeacherError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {editTeacherError}
            </div>
          )}
        </div>
      </CreationDialog>
    </div>
  );
}
