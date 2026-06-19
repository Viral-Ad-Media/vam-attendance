"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Mail,
  PauseCircle,
  Users,
  XCircle,
} from "lucide-react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EnrollmentStatus = "active" | "paused" | "completed" | "dropped";
type AttendanceStatus = "present" | "absent" | "late";

type Teacher = {
  id: string;
  name: string;
  email: string;
  created_at?: string | null;
};

type Student = {
  id: string;
  name: string;
  email?: string | null;
  program?: string | null;
  class_name?: string | null;
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

type Enrollment = {
  id: string;
  course_id: string;
  student_id: string;
  teacher_id?: string | null;
  status: EnrollmentStatus;
  enrolled_at?: string | null;
};

type Session = {
  id: string;
  course_id?: string | null;
  teacher_id?: string | null;
  starts_at: string;
};

type Attendance = {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
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

function statusClass(status: EnrollmentStatus) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "completed") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-red-200 bg-red-50 text-red-700";
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

export default function TeacherProfilePageClient() {
  const params = useParams();
  const teacherId = getRouteId(params?.id);

  const [teacher, setTeacher] = React.useState<Teacher | null>(null);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!teacherId) return;

      try {
        setLoading(true);
        setError(null);
        const [teacherRes, studentRes, courseRes, enrollmentRes, sessionRes, attendanceRes] =
          await Promise.all([
            fetch(`/api/teachers/${teacherId}`, { cache: "no-store" }),
            fetch("/api/students", { cache: "no-store" }),
            fetch("/api/courses", { cache: "no-store" }),
            fetch("/api/enrollments", { cache: "no-store" }),
            fetch("/api/sessions", { cache: "no-store" }),
            fetch("/api/attendance", { cache: "no-store" }),
          ]);

        if (!teacherRes.ok) throw new Error(await teacherRes.text());
        if (!studentRes.ok) throw new Error(await studentRes.text());
        if (!courseRes.ok) throw new Error(await courseRes.text());
        if (!enrollmentRes.ok) throw new Error(await enrollmentRes.text());
        if (!sessionRes.ok) throw new Error(await sessionRes.text());
        if (!attendanceRes.ok) throw new Error(await attendanceRes.text());

        setTeacher((await teacherRes.json()) as Teacher);
        setStudents((await studentRes.json()) as Student[]);
        setCourses((await courseRes.json()) as Course[]);
        setEnrollments((await enrollmentRes.json()) as Enrollment[]);
        setSessions((await sessionRes.json()) as Session[]);
        setAttendance((await attendanceRes.json()) as Attendance[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load teacher profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [teacherId]);

  const studentById = React.useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const courseById = React.useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const teacherCourses = React.useMemo(
    () => courses.filter((course) => course.lead_teacher_id === teacherId),
    [courses, teacherId]
  );
  const teacherCourseIds = React.useMemo(
    () => new Set(teacherCourses.map((course) => course.id)),
    [teacherCourses]
  );

  const teacherEnrollments = React.useMemo(
    () =>
      enrollments.filter(
        (enrollment) => enrollment.teacher_id === teacherId || teacherCourseIds.has(enrollment.course_id)
      ),
    [enrollments, teacherCourseIds, teacherId]
  );
  const relatedCourseIds = React.useMemo(
    () => new Set([...teacherCourseIds, ...teacherEnrollments.map((enrollment) => enrollment.course_id)]),
    [teacherCourseIds, teacherEnrollments]
  );

  const uniqueStudentIds = React.useMemo(
    () => new Set(teacherEnrollments.map((enrollment) => enrollment.student_id)),
    [teacherEnrollments]
  );
  const activeStudentIds = React.useMemo(
    () =>
      new Set(
        teacherEnrollments
          .filter((enrollment) => enrollment.status === "active")
          .map((enrollment) => enrollment.student_id)
      ),
    [teacherEnrollments]
  );

  const statusCounts = React.useMemo(() => {
    const counts: Record<EnrollmentStatus, number> = {
      active: 0,
      paused: 0,
      completed: 0,
      dropped: 0,
    };
    teacherEnrollments.forEach((enrollment) => {
      counts[enrollment.status] += 1;
    });
    return counts;
  }, [teacherEnrollments]);

  const teacherSessionIds = React.useMemo(() => {
    const ids = new Set<string>();
    sessions.forEach((session) => {
      if (session.teacher_id === teacherId || (session.course_id && teacherCourseIds.has(session.course_id))) {
        ids.add(session.id);
      }
    });
    return ids;
  }, [sessions, teacherCourseIds, teacherId]);

  const teacherAttendance = React.useMemo(
    () => attendance.filter((row) => teacherSessionIds.has(row.session_id)),
    [attendance, teacherSessionIds]
  );
  const attendanceRate = teacherAttendance.length
    ? Math.round(
        (teacherAttendance.filter((row) => row.status === "present" || row.status === "late").length /
          teacherAttendance.length) *
          100
      )
    : 0;

  const studentsInTraining = React.useMemo(
    () =>
      [...activeStudentIds]
        .map((studentId) => {
          const student = studentById.get(studentId);
          const activeEnrollments = teacherEnrollments.filter(
            (enrollment) => enrollment.student_id === studentId && enrollment.status === "active"
          );
          return student ? { student, activeEnrollments } : null;
        })
        .filter((entry): entry is { student: Student; activeEnrollments: Enrollment[] } => Boolean(entry))
        .sort((a, b) => a.student.name.localeCompare(b.student.name)),
    [activeStudentIds, studentById, teacherEnrollments]
  );

  const courseSummaries = React.useMemo(
    () =>
      courses
        .filter((course) => relatedCourseIds.has(course.id))
        .map((course) => {
          const courseEnrollments = teacherEnrollments.filter((enrollment) => enrollment.course_id === course.id);
          const active = courseEnrollments.filter((enrollment) => enrollment.status === "active").length;
          return { course, total: courseEnrollments.length, active };
        })
        .sort((a, b) => a.course.title.localeCompare(b.course.title)),
    [courses, relatedCourseIds, teacherEnrollments]
  );

  return (
    <div className="space-y-4">
      <TopBar title="Teacher Profile" subtitle={teacher?.name ?? "Enrollment summary"} showAccountInTitle={false} />

      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard/teachers">
          <ArrowLeft className="h-4 w-4" />
          Teachers
        </Link>
      </Button>

      {loading && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Loading teacher profile...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && teacher && (
        <>
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <Users className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-950">{teacher.name}</h1>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {teacher.email}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">Joined {formatDate(teacher.created_at)}</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total Enrolled Students" value={uniqueStudentIds.size} icon={GraduationCap} />
            <StatTile label="Still In Training" value={activeStudentIds.size} icon={Clock} />
            <StatTile label="Active Enrollments" value={statusCounts.active} icon={CheckCircle2} />
            <StatTile label="Attendance Rate" value={`${attendanceRate}%`} icon={BookOpen} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Paused" value={statusCounts.paused} icon={PauseCircle} />
            <StatTile label="Completed" value={statusCounts.completed} icon={CheckCircle2} />
            <StatTile label="Dropped" value={statusCounts.dropped} icon={XCircle} />
            <StatTile label="Courses Led" value={teacherCourses.length} icon={BookOpen} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Students Still In Training</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentsInTraining.length ? (
                  studentsInTraining.map(({ student, activeEnrollments }) => (
                    <div key={student.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            className="font-medium text-slate-900 hover:text-sky-700"
                          >
                            {student.name}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{student.email ?? "No email"}</p>
                        </div>
                        <Badge variant="outline" className={statusClass("active")}>
                          {activeEnrollments.length} active
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeEnrollments.map((enrollment) => {
                          const course = courseById.get(enrollment.course_id);
                          return (
                            <Badge key={enrollment.id} variant="outline">
                              {course?.title ?? "Course"}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    No active students assigned to this teacher.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assigned Courses And Enrollment Load</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {courseSummaries.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2 pr-3">Course</th>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">Active</th>
                        <th className="py-2 pr-0 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseSummaries.map(({ course, total, active }) => (
                        <tr key={course.id} className="border-t border-slate-100">
                          <td className="py-2 pr-3 font-medium text-slate-800">{course.title}</td>
                          <td className="py-2 pr-3 text-slate-600">{course.course_type ?? course.modality}</td>
                          <td className="py-2 pr-3 text-slate-600">{active}</td>
                          <td className="py-2 pr-0 text-right text-slate-900">{total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    No courses assigned to this teacher.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrollment Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                {(["active", "paused", "completed", "dropped"] as EnrollmentStatus[]).map((status) => (
                  <div key={status} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={statusClass(status)}>
                        {status}
                      </Badge>
                      <span className="text-xl font-semibold text-slate-950">{statusCounts[status]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
