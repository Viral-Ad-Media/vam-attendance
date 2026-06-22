"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  Mail,
  MessageSquareText,
  Phone,
  Star,
  UserRound,
  XCircle,
} from "lucide-react";
import { TopBar } from "@/components/dashboard/TopBar";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AttendanceStatus = "present" | "absent" | "late";
type EnrollmentStatus = "active" | "paused" | "completed" | "dropped";

type Student = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  program?: string | null;
  duration_weeks?: number | null;
  sessions_per_week?: number | null;
  class_name?: string | null;
  created_at?: string | null;
};

type Course = {
  id: string;
  title: string;
  modality: "group" | "1on1";
  lead_teacher_id?: string | null;
  course_type?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

type Teacher = {
  id: string;
  name: string;
  email?: string | null;
};

type Enrollment = {
  id: string;
  student_id: string;
  course_id: string;
  teacher_id?: string | null;
  status: EnrollmentStatus;
  enrolled_at?: string | null;
};

type Session = {
  id: string;
  course_id?: string | null;
  teacher_id?: string | null;
  title?: string | null;
  starts_at: string;
  ends_at?: string | null;
  class_name?: string | null;
};

type Attendance = {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  notes?: string | null;
  noted_at?: string | null;
};

type FeedbackCategory = "general" | "progress" | "participation" | "behavior" | "homework" | "assessment";
type FeedbackSentiment = "positive" | "neutral" | "needs_attention";

type StudentFeedback = {
  id: string;
  student_id: string;
  teacher_id?: string | null;
  course_id?: string | null;
  session_id?: string | null;
  rating?: number | null;
  category: FeedbackCategory;
  sentiment: FeedbackSentiment;
  visibility?: "internal" | "shareable";
  source?: "internal" | "student";
  title: string;
  body: string;
  reviewed_at?: string | null;
  created_at?: string | null;
};

const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
  general: "General",
  progress: "Progress",
  participation: "Participation",
  behavior: "Behavior",
  homework: "Homework",
  assessment: "Assessment",
};

const feedbackSentimentLabels: Record<FeedbackSentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  needs_attention: "Needs attention",
};

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClass(status: EnrollmentStatus | AttendanceStatus) {
  if (status === "active" || status === "present") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "late" || status === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "completed") return "border-primary/20 bg-primary/10 text-primary";
  return "border-red-200 bg-red-50 text-red-700";
}

function feedbackSentimentClass(sentiment: FeedbackSentiment) {
  if (sentiment === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (sentiment === "needs_attention") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function RatingStars({ rating }: { rating?: number | null }) {
  if (!rating) return <span className="text-xs font-medium text-slate-500">No rating</span>;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={index < rating ? "h-3.5 w-3.5 fill-amber-400 text-amber-400" : "h-3.5 w-3.5 text-slate-300"}
        />
      ))}
    </span>
  );
}

function StatTile({
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

export default function StudentProfilePageClient() {
  const params = useParams();
  const studentId = getRouteId(params?.id);

  const [student, setStudent] = React.useState<Student | null>(null);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [feedback, setFeedback] = React.useState<StudentFeedback[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [enrollmentPage, setEnrollmentPage] = React.useState(1);
  const [enrollmentPageSize, setEnrollmentPageSize] = React.useState(5);
  const [attendancePage, setAttendancePage] = React.useState(1);
  const [attendancePageSize, setAttendancePageSize] = React.useState(10);
  const [feedbackPage, setFeedbackPage] = React.useState(1);
  const [feedbackPageSize, setFeedbackPageSize] = React.useState(5);

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!studentId) return;

      try {
        setLoading(true);
        setError(null);
        const [studentRes, courseRes, teacherRes, enrollmentRes, sessionRes, attendanceRes, feedbackRes] =
          await Promise.all([
            fetch(`/api/students/${studentId}`, { cache: "no-store" }),
            fetch("/api/courses", { cache: "no-store" }),
            fetch("/api/teachers", { cache: "no-store" }),
            fetch(`/api/enrollments?student_id=${studentId}`, { cache: "no-store" }),
            fetch("/api/sessions", { cache: "no-store" }),
            fetch(`/api/attendance?student_id=${studentId}`, { cache: "no-store" }),
            fetch(`/api/student-feedback?student_id=${studentId}`, { cache: "no-store" }),
          ]);

        if (!studentRes.ok) throw new Error(await studentRes.text());
        if (!courseRes.ok) throw new Error(await courseRes.text());
        if (!teacherRes.ok) throw new Error(await teacherRes.text());
        if (!enrollmentRes.ok) throw new Error(await enrollmentRes.text());
        if (!sessionRes.ok) throw new Error(await sessionRes.text());
        if (!attendanceRes.ok) throw new Error(await attendanceRes.text());
        if (!feedbackRes.ok) throw new Error(await feedbackRes.text());

        setStudent((await studentRes.json()) as Student);
        setCourses((await courseRes.json()) as Course[]);
        setTeachers((await teacherRes.json()) as Teacher[]);
        setEnrollments((await enrollmentRes.json()) as Enrollment[]);
        setSessions((await sessionRes.json()) as Session[]);
        setAttendance((await attendanceRes.json()) as Attendance[]);
        setFeedback((await feedbackRes.json()) as StudentFeedback[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load student profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [studentId]);

  const courseById = React.useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const teacherById = React.useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher])), [teachers]);
  const sessionById = React.useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);

  const sortedEnrollments = React.useMemo(
    () =>
      [...enrollments].sort(
        (a, b) =>
          new Date(b.enrolled_at ?? 0).getTime() - new Date(a.enrolled_at ?? 0).getTime()
      ),
    [enrollments]
  );
  const enrollmentTotalPages = Math.max(1, Math.ceil(sortedEnrollments.length / enrollmentPageSize));
  React.useEffect(() => {
    setEnrollmentPage((currentPage) => Math.min(currentPage, enrollmentTotalPages));
  }, [enrollmentTotalPages]);
  const paginatedEnrollments = React.useMemo(() => {
    const start = (enrollmentPage - 1) * enrollmentPageSize;
    return sortedEnrollments.slice(start, start + enrollmentPageSize);
  }, [sortedEnrollments, enrollmentPage, enrollmentPageSize]);

  const attendanceRows = React.useMemo(
    () =>
      attendance
        .map((row) => ({ row, session: sessionById.get(row.session_id) ?? null }))
        .sort((a, b) => {
          const aDate = a.session?.starts_at ?? a.row.noted_at ?? "";
          const bDate = b.session?.starts_at ?? b.row.noted_at ?? "";
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        }),
    [attendance, sessionById]
  );
  const attendanceTotalPages = Math.max(1, Math.ceil(attendanceRows.length / attendancePageSize));
  React.useEffect(() => {
    setAttendancePage((currentPage) => Math.min(currentPage, attendanceTotalPages));
  }, [attendanceTotalPages]);
  const paginatedAttendanceRows = React.useMemo(() => {
    const start = (attendancePage - 1) * attendancePageSize;
    return attendanceRows.slice(start, start + attendancePageSize);
  }, [attendanceRows, attendancePage, attendancePageSize]);

  const sortedFeedback = React.useMemo(
    () =>
      [...feedback].sort(
        (a, b) =>
          new Date(b.reviewed_at ?? b.created_at ?? 0).getTime() -
          new Date(a.reviewed_at ?? a.created_at ?? 0).getTime()
      ),
    [feedback]
  );
  const feedbackTotalPages = Math.max(1, Math.ceil(sortedFeedback.length / feedbackPageSize));
  React.useEffect(() => {
    setFeedbackPage((currentPage) => Math.min(currentPage, feedbackTotalPages));
  }, [feedbackTotalPages]);
  const paginatedFeedback = React.useMemo(() => {
    const start = (feedbackPage - 1) * feedbackPageSize;
    return sortedFeedback.slice(start, start + feedbackPageSize);
  }, [sortedFeedback, feedbackPage, feedbackPageSize]);

  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === "active");
  const presentCount = attendance.filter((row) => row.status === "present").length;
  const lateCount = attendance.filter((row) => row.status === "late").length;
  const absentCount = attendance.filter((row) => row.status === "absent").length;
  const attendanceRate = attendance.length
    ? Math.round(((presentCount + lateCount) / attendance.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <TopBar title="Student Profile" subtitle={student?.name ?? "Enrollment and attendance"} showAccountInTitle={false} />

      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/students">
          <ArrowLeft className="h-4 w-4" />
          Students
        </Link>
      </Button>

      {loading && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Loading student profile...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && student && (
        <>
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-950">{student.name}</h1>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {student.email ?? "No email"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {student.phone ?? "No phone"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        {student.country ?? "No country"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {student.program && <Badge variant="outline">{student.program}</Badge>}
                  {student.class_name && <Badge variant="outline">{student.class_name}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile label="Enrollments" value={enrollments.length} icon={BookOpen} />
            <StatTile label="Active Courses" value={activeEnrollments.length} icon={Clock} />
            <StatTile label="Attendance Rate" value={`${attendanceRate}%`} icon={CheckCircle2} />
            <StatTile label="Absences" value={absentCount} icon={XCircle} />
            <StatTile label="Reviews" value={feedback.length} icon={MessageSquareText} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enrollments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedEnrollments.length ? (
                  paginatedEnrollments.map((enrollment) => {
                    const course = courseById.get(enrollment.course_id);
                    const teacher =
                      (enrollment.teacher_id && teacherById.get(enrollment.teacher_id)) ||
                      (course?.lead_teacher_id && teacherById.get(course.lead_teacher_id)) ||
                      null;

                    return (
                      <div key={enrollment.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{course?.title ?? "Untitled course"}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {teacher?.name ?? "Unassigned teacher"} - enrolled {formatDate(enrollment.enrolled_at)}
                            </p>
                          </div>
                          <Badge variant="outline" className={statusClass(enrollment.status)}>
                            {enrollment.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    No enrollments yet.
                  </div>
                )}
                {sortedEnrollments.length > 0 && (
                  <PaginationControls
                    page={enrollmentPage}
                    pageSize={enrollmentPageSize}
                    totalItems={sortedEnrollments.length}
                    itemLabel="enrollments"
                    pageSizeOptions={[5, 10, 25]}
                    onPageChange={setEnrollmentPage}
                    onPageSizeChange={(pageSize) => {
                      setEnrollmentPageSize(pageSize);
                      setEnrollmentPage(1);
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Attendance History</CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className={statusClass("present")}>Present {presentCount}</Badge>
                    <Badge variant="outline" className={statusClass("late")}>Late {lateCount}</Badge>
                    <Badge variant="outline" className={statusClass("absent")}>Absent {absentCount}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {attendanceRows.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2 pr-3">Session</th>
                        <th className="py-2 pr-3">Course</th>
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-0 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAttendanceRows.map(({ row, session }) => {
                        const course = session?.course_id ? courseById.get(session.course_id) : null;
                        return (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="py-2 pr-3 font-medium text-slate-800">{session?.title ?? "Session"}</td>
                            <td className="py-2 pr-3 text-slate-600">{course?.title ?? "No course"}</td>
                            <td className="py-2 pr-3 text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {formatDateTime(session?.starts_at ?? row.noted_at)}
                              </span>
                            </td>
                            <td className="py-2 pr-0 text-right">
                              <Badge variant="outline" className={statusClass(row.status)}>
                                {row.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    No attendance history yet.
                  </div>
                )}
                {attendanceRows.length > 0 && (
                  <PaginationControls
                    page={attendancePage}
                    pageSize={attendancePageSize}
                    totalItems={attendanceRows.length}
                    itemLabel="attendance marks"
                    onPageChange={setAttendancePage}
                    onPageSizeChange={(pageSize) => {
                      setAttendancePageSize(pageSize);
                      setAttendancePage(1);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Feedback & Reviews</CardTitle>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/feedback?student_id=${student.id}`}>
                    <MessageSquareText className="h-4 w-4" />
                    Open Reviews
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedFeedback.length ? (
                paginatedFeedback.map((review) => {
                  const course = review.course_id ? courseById.get(review.course_id) : null;
                  const teacher =
                    (review.teacher_id && teacherById.get(review.teacher_id)) ||
                    (course?.lead_teacher_id && teacherById.get(course.lead_teacher_id)) ||
                    null;
                  const session = review.session_id ? sessionById.get(review.session_id) : null;

                  return (
                    <div key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-950">{review.title}</h3>
                            <Badge variant="outline" className={feedbackSentimentClass(review.sentiment)}>
                              {feedbackSentimentLabels[review.sentiment]}
                            </Badge>
                            <Badge variant="outline">{feedbackCategoryLabels[review.category]}</Badge>
                            {review.source === "student" && (
                              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                                Student submitted
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{review.body}</p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span>{formatDate(review.reviewed_at)}</span>
                            <span>{course?.title ?? "No course"}</span>
                            <span>{teacher?.name ?? "No teacher"}</span>
                            {session && <span>{session.title ?? formatDateTime(session.starts_at)}</span>}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <RatingStars rating={review.rating} />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  No feedback yet.
                </div>
              )}
              {sortedFeedback.length > 0 && (
                <PaginationControls
                  page={feedbackPage}
                  pageSize={feedbackPageSize}
                  totalItems={sortedFeedback.length}
                  itemLabel="reviews"
                  pageSizeOptions={[5, 10, 25]}
                  onPageChange={setFeedbackPage}
                  onPageSizeChange={(pageSize) => {
                    setFeedbackPageSize(pageSize);
                    setFeedbackPage(1);
                  }}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
