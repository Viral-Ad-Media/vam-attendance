"use client";

import Link from "next/link";
import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ClipboardList, Users } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function TeacherDashboard() {
  return (
    <div className="space-y-4">
      <TopBar title="Teacher Dashboard" subtitle="Your classes and attendance" showAccountInTitle={false} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Welcome back</CardTitle>
            <p className="text-xs text-slate-200">View your sessions and mark attendance quickly.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="bg-white text-slate-900 hover:bg-white/90">
              <Link href="/dashboard/attendance">Mark attendance</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/15">
              <Link href="/dashboard/sessions">View sessions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <Link href="/dashboard/sessions" className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">
              <CalendarDays className="h-4 w-4 text-slate-500" /> Upcoming sessions
            </Link>
            <Link href="/dashboard/attendance" className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">
              <ClipboardList className="h-4 w-4 text-slate-500" /> Attendance calendar
            </Link>
            <Link href="/dashboard/students" className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">
              <Users className="h-4 w-4 text-slate-500" /> Student directory
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
