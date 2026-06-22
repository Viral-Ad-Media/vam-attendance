"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { TopBar } from "@/components/dashboard/TopBar";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FeedbackCategory = "general" | "progress" | "participation" | "behavior" | "homework" | "assessment";
type FeedbackSentiment = "positive" | "neutral" | "needs_attention";
type FeedbackVisibility = "internal" | "shareable";

type StudentFeedback = {
  id: string;
  student_id: string;
  teacher_id?: string | null;
  course_id?: string | null;
  session_id?: string | null;
  rating?: number | null;
  category: FeedbackCategory;
  sentiment: FeedbackSentiment;
  visibility: FeedbackVisibility;
  source?: "internal" | "student";
  title: string;
  body: string;
  reviewed_at?: string | null;
  created_at?: string | null;
};

type Student = { id: string; name: string; email?: string | null };
type Teacher = { id: string; name: string; email?: string | null };
type Course = { id: string; title: string; lead_teacher_id?: string | null };
type Session = {
  id: string;
  title?: string | null;
  course_id?: string | null;
  teacher_id?: string | null;
  starts_at: string;
};

type FeedbackForm = {
  id?: string;
  student_id: string;
  teacher_id: string;
  course_id: string;
  session_id: string;
  rating: string;
  category: FeedbackCategory;
  sentiment: FeedbackSentiment;
  visibility: FeedbackVisibility;
  title: string;
  body: string;
  reviewed_at: string;
};

const categoryLabels: Record<FeedbackCategory, string> = {
  general: "General",
  progress: "Progress",
  participation: "Participation",
  behavior: "Behavior",
  homework: "Homework",
  assessment: "Assessment",
};

const sentimentLabels: Record<FeedbackSentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  needs_attention: "Needs attention",
};

const sentimentClasses: Record<FeedbackSentiment, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  needs_attention: "border-amber-200 bg-amber-50 text-amber-700",
};

const defaultForm: FeedbackForm = {
  student_id: "",
  teacher_id: "none",
  course_id: "none",
  session_id: "none",
  rating: "none",
  category: "general",
  sentiment: "neutral",
  visibility: "internal",
  title: "",
  body: "",
  reviewed_at: "",
};

function formatDate(value?: string | null) {
  if (!value) return "Not dated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not dated";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toLocalDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function readResponseError(response: Response, fallback: string) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return text || fallback;
  }
}

function compactPayload(form: FeedbackForm) {
  return {
    student_id: form.student_id,
    teacher_id: form.teacher_id === "none" ? null : form.teacher_id,
    course_id: form.course_id === "none" ? null : form.course_id,
    session_id: form.session_id === "none" ? null : form.session_id,
    rating: form.rating === "none" ? null : Number(form.rating),
    category: form.category,
    sentiment: form.sentiment,
    visibility: form.visibility,
    title: form.title.trim(),
    body: form.body.trim(),
    reviewed_at: form.reviewed_at ? new Date(`${form.reviewed_at}T12:00:00`).toISOString() : null,
  };
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RatingStars({ rating }: { rating?: number | null }) {
  if (!rating) return <span className="text-xs font-medium text-slate-500">No rating</span>;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "h-3.5 w-3.5",
            index < rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
          )}
        />
      ))}
    </span>
  );
}

export default function FeedbackPageClient() {
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = React.useState<StudentFeedback[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<FeedbackForm>(defaultForm);
  const [query, setQuery] = React.useState("");
  const [studentFilter, setStudentFilter] = React.useState("all");
  const [sentimentFilter, setSentimentFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    const studentId = searchParams.get("student_id");
    if (studentId) setStudentFilter(studentId);
  }, [searchParams]);

  const loadAll = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [feedbackRes, studentsRes, teachersRes, coursesRes, sessionsRes] = await Promise.all([
        fetch("/api/student-feedback", { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
        fetch("/api/teachers", { cache: "no-store" }),
        fetch("/api/courses", { cache: "no-store" }),
        fetch("/api/sessions", { cache: "no-store" }),
      ]);

      if (!feedbackRes.ok) throw new Error(await readResponseError(feedbackRes, "Failed to load feedback"));
      if (!studentsRes.ok) throw new Error(await readResponseError(studentsRes, "Failed to load students"));
      if (!teachersRes.ok) throw new Error(await readResponseError(teachersRes, "Failed to load teachers"));
      if (!coursesRes.ok) throw new Error(await readResponseError(coursesRes, "Failed to load courses"));
      if (!sessionsRes.ok) throw new Error(await readResponseError(sessionsRes, "Failed to load sessions"));

      setFeedback((await feedbackRes.json()) as StudentFeedback[]);
      setStudents((await studentsRes.json()) as Student[]);
      setTeachers((await teachersRes.json()) as Teacher[]);
      setCourses((await coursesRes.json()) as Course[]);
      setSessions((await sessionsRes.json()) as Session[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  const studentById = React.useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const teacherById = React.useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher])), [teachers]);
  const courseById = React.useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const sessionById = React.useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);

  const filteredFeedback = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return feedback.filter((item) => {
      const student = studentById.get(item.student_id);
      const teacher = item.teacher_id ? teacherById.get(item.teacher_id) : null;
      const course = item.course_id ? courseById.get(item.course_id) : null;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        (student?.name ?? "").toLowerCase().includes(q) ||
        (teacher?.name ?? "").toLowerCase().includes(q) ||
        (course?.title ?? "").toLowerCase().includes(q);
      const matchesStudent = studentFilter === "all" || item.student_id === studentFilter;
      const matchesSentiment = sentimentFilter === "all" || item.sentiment === sentimentFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesQuery && matchesStudent && matchesSentiment && matchesCategory;
    });
  }, [categoryFilter, courseById, feedback, query, sentimentFilter, studentById, studentFilter, teacherById]);

  const totalPages = Math.max(1, Math.ceil(filteredFeedback.length / pageSize));
  React.useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);
  const paginatedFeedback = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFeedback.slice(start, start + pageSize);
  }, [filteredFeedback, page, pageSize]);

  const averageRating = React.useMemo(() => {
    const rated = feedback.filter((item) => typeof item.rating === "number");
    if (!rated.length) return "N/A";
    const average = rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length;
    return average.toFixed(1);
  }, [feedback]);
  const needsAttentionCount = feedback.filter((item) => item.sentiment === "needs_attention").length;
  const shareableCount = feedback.filter((item) => item.visibility === "shareable").length;

  const openCreateDialog = () => {
    setForm({
      ...defaultForm,
      student_id: students[0]?.id ?? "",
      reviewed_at: toLocalDate(new Date().toISOString()),
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: StudentFeedback) => {
    setForm({
      id: item.id,
      student_id: item.student_id,
      teacher_id: item.teacher_id ?? "none",
      course_id: item.course_id ?? "none",
      session_id: item.session_id ?? "none",
      rating: item.rating ? String(item.rating) : "none",
      category: item.category,
      sentiment: item.sentiment,
      visibility: item.visibility,
      title: item.title,
      body: item.body,
      reviewed_at: toLocalDate(item.reviewed_at),
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const saveFeedback = async () => {
    if (!form.student_id) {
      setFormError("Choose a student before saving.");
      return;
    }
    if (!form.title.trim() || !form.body.trim()) {
      setFormError("Add a title and review note before saving.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(form.id ? `/api/student-feedback/${form.id}` : "/api/student-feedback", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compactPayload(form)),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, "Failed to save review"));
      }

      await loadAll();
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  const deleteFeedback = async (item: StudentFeedback) => {
    const studentName = studentById.get(item.student_id)?.name ?? "this student";
    if (!window.confirm(`Delete "${item.title}" for ${studentName}?`)) return;

    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/student-feedback/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readResponseError(response, "Failed to delete review"));
      setFeedback((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <TopBar title="Student Feedback" subtitle="Reviews and progress notes" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Total Reviews" value={feedback.length} icon={MessageSquareText} />
        <MetricTile label="Average Rating" value={averageRating} icon={Star} />
        <MetricTile label="Needs Attention" value={needsAttentionCount} icon={AlertTriangle} />
        <MetricTile label="Shareable" value={shareableCount} icon={UserRoundCheck} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">Reviews</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search reviews"
                  className="w-full pl-9 sm:w-[240px]"
                />
              </div>
              <Button onClick={openCreateDialog} disabled={!students.length}>
                <Plus className="h-4 w-4" />
                Add Review
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <Select
              value={studentFilter}
              onValueChange={(value) => {
                setStudentFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sentimentFilter}
              onValueChange={(value) => {
                setSentimentFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sentiment</SelectItem>
                {Object.entries(sentimentLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reviews...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {paginatedFeedback.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3">Student</th>
                        <th className="py-2 pr-3">Review</th>
                        <th className="py-2 pr-3">Context</th>
                        <th className="py-2 pr-3">Rating</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-0 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFeedback.map((item) => {
                        const student = studentById.get(item.student_id);
                        const teacher = item.teacher_id ? teacherById.get(item.teacher_id) : null;
                        const course = item.course_id ? courseById.get(item.course_id) : null;
                        const session = item.session_id ? sessionById.get(item.session_id) : null;

                        return (
                          <tr key={item.id} className="border-t border-slate-100 align-top">
                            <td className="py-3 pr-3">
                              <Link
                                href={`/dashboard/students/${item.student_id}`}
                                className="font-semibold text-slate-900 hover:text-primary"
                              >
                                {student?.name ?? "Unknown student"}
                              </Link>
                              <p className="mt-1 text-xs text-slate-500">{formatDate(item.reviewed_at)}</p>
                            </td>
                            <td className="max-w-[360px] py-3 pr-3">
                              <p className="font-medium text-slate-900">{item.title}</p>
                              <p className="mt-1 line-clamp-2 text-slate-600">{item.body}</p>
                            </td>
                            <td className="py-3 pr-3 text-slate-600">
                              <p className="font-medium text-slate-800">{course?.title ?? "No course"}</p>
                              <p className="mt-1 text-xs text-slate-500">{teacher?.name ?? "No teacher"}</p>
                              {session && (
                                <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {session.title ?? formatDate(session.starts_at)}
                                </p>
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              <RatingStars rating={item.rating} />
                            </td>
                            <td className="py-3 pr-3">
                              <div className="flex flex-wrap gap-1.5">
                                <Badge variant="outline" className={sentimentClasses[item.sentiment]}>
                                  {sentimentLabels[item.sentiment]}
                                </Badge>
                                <Badge variant="outline">{categoryLabels[item.category]}</Badge>
                                <Badge variant="outline" className="capitalize">
                                  {item.visibility}
                                </Badge>
                                {item.source === "student" && (
                                  <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                                    Student submitted
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 pr-0">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteFeedback(item)}
                                  disabled={deletingId === item.id}
                                  className="text-red-700 hover:bg-red-50"
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  No reviews found.
                </div>
              )}

              {filteredFeedback.length > 0 && (
                <PaginationControls
                  page={page}
                  pageSize={pageSize}
                  totalItems={filteredFeedback.length}
                  itemLabel="reviews"
                  onPageChange={setPage}
                  onPageSizeChange={(nextPageSize) => {
                    setPageSize(nextPageSize);
                    setPage(1);
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Review" : "Add Review"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feedback-student">Student</Label>
              <Select
                value={form.student_id || undefined}
                onValueChange={(value) => setForm((current) => ({ ...current, student_id: value }))}
              >
                <SelectTrigger id="feedback-student" className="w-full bg-white">
                  <SelectValue placeholder="Choose student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-date">Review Date</Label>
              <Input
                id="feedback-date"
                type="date"
                value={form.reviewed_at}
                onChange={(event) => setForm((current) => ({ ...current, reviewed_at: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-teacher">Teacher</Label>
              <Select
                value={form.teacher_id}
                onValueChange={(value) => setForm((current) => ({ ...current, teacher_id: value }))}
              >
                <SelectTrigger id="feedback-teacher" className="w-full bg-white">
                  <SelectValue placeholder="Teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No teacher</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-course">Course</Label>
              <Select
                value={form.course_id}
                onValueChange={(value) => setForm((current) => ({ ...current, course_id: value }))}
              >
                <SelectTrigger id="feedback-course" className="w-full bg-white">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-session">Session</Label>
              <Select
                value={form.session_id}
                onValueChange={(value) => setForm((current) => ({ ...current, session_id: value }))}
              >
                <SelectTrigger id="feedback-session" className="w-full bg-white">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No session</SelectItem>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.title ?? formatDate(session.starts_at)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-rating">Rating</Label>
              <Select
                value={form.rating}
                onValueChange={(value) => setForm((current) => ({ ...current, rating: value }))}
              >
                <SelectTrigger id="feedback-rating" className="w-full bg-white">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No rating</SelectItem>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <SelectItem key={rating} value={String(rating)}>
                      {rating} star{rating === 1 ? "" : "s"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, category: value as FeedbackCategory }))
                }
              >
                <SelectTrigger id="feedback-category" className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-sentiment">Sentiment</Label>
              <Select
                value={form.sentiment}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, sentiment: value as FeedbackSentiment }))
                }
              >
                <SelectTrigger id="feedback-sentiment" className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sentimentLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="feedback-visibility">Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, visibility: value as FeedbackVisibility }))
                }
              >
                <SelectTrigger id="feedback-visibility" className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="shareable">Shareable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="feedback-title">Title</Label>
              <Input
                id="feedback-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Review title"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="feedback-body">Review</Label>
              <Textarea
                id="feedback-body"
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                placeholder="Write the review"
              />
            </div>
          </div>

          {formError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveFeedback} disabled={saving || !students.length}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
