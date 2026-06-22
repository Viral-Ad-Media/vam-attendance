"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertCircle, Loader, TrendingUp, Users, Calendar } from "lucide-react";

type AttendanceStat = {
  date: string;
  present: number;
  absent: number;
  late: number;
};

type StudentStat = {
  name: string;
  attendanceRate: number;
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

export default function ReportsPageClient() {
  const [stats, setStats] = React.useState<{
    attendanceByDate: AttendanceStat[];
    studentAttendance: StudentStat[];
    totalAttendanceRate: number;
    totalStudents: number;
    totalSessions: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadStats = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [attendanceRes, studentsRes, sessionsRes] = await Promise.all([
        fetch("/api/attendance?limit=1000", { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
        fetch("/api/sessions", { cache: "no-store" }),
      ]);

      if (!attendanceRes.ok) throw new Error(await readResponseError(attendanceRes, "Failed to load attendance"));
      if (!studentsRes.ok) throw new Error(await readResponseError(studentsRes, "Failed to load students"));
      if (!sessionsRes.ok) throw new Error(await readResponseError(sessionsRes, "Failed to load sessions"));

      const attendanceData = (await attendanceRes.json()) as Array<{
        id: string;
        status: "present" | "absent" | "late";
        created_at: string;
      }>;
      const studentsData = (await studentsRes.json()) as Array<{ id: string; name: string }>;
      const sessionsData = (await sessionsRes.json()) as Array<{ id: string }>;

      // Group by date
      const byDate = new Map<string, { present: number; absent: number; late: number }>();
      attendanceData.forEach((record) => {
        const date = new Date(record.created_at).toLocaleDateString();
        if (!byDate.has(date)) {
          byDate.set(date, { present: 0, absent: 0, late: 0 });
        }
        const dayStats = byDate.get(date)!;
        dayStats[record.status]++;
      });

      const attendanceByDate = Array.from(byDate.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-14); // Last 14 days

      // Calculate total attendance rate
      const totalRecords = attendanceData.length;
      const presentCount = attendanceData.filter((r) => r.status === "present").length;
      const totalAttendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

      setStats({
        attendanceByDate,
        studentAttendance: [],
        totalAttendanceRate,
        totalStudents: studentsData.length,
        totalSessions: sessionsData.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="w-full space-y-5">
      <TopBar title="Reports" subtitle="View organization analytics and insights" />

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-6 shadow-sm">
          <Loader className="mr-2 h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-slate-600">Loading reports…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mr-2 inline-block h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && stats && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Attendance rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.totalAttendanceRate}%</p>
                <p className="text-xs text-slate-600 mt-1">Organization-wide average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Total students</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.totalStudents}</p>
                <p className="text-xs text-slate-600 mt-1">Enrolled in organization</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Total sessions</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.totalSessions}</p>
                <p className="text-xs text-slate-600 mt-1">Scheduled in organization</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Attendance trend (14 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.attendanceByDate.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.attendanceByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#10b981" name="Present" />
                    <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                    <Bar dataKey="late" fill="#f59e0b" name="Late" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-600">
                  No attendance data available
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
