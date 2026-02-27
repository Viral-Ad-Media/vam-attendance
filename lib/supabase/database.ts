// lib/supabase/database.ts
import { getBrowserSupabase } from "./client";
import type { AttendanceRow } from "@/app/types/attendance";

/**
 * USERS TABLE
 */
export async function createUserProfile(userId: string, data: {
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatar_url?: string;
}) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: result, error } = await supabase
    .from("users")
    .insert([{ id: userId, ...data, created_at: new Date().toISOString() }])
    .select();

  if (error) throw error;
  return result;
}

export async function getUserProfile(userId: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: Record<string, any>) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select();

  if (error) throw error;
  return data;
}

/**
 * TEACHERS TABLE
 */
export async function createTeacher(data: {
  name: string;
  email: string;
  user_id?: string;
  department?: string;
  phone?: string;
}) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: result, error } = await supabase
    .from("teachers")
    .insert([{ ...data, created_at: new Date().toISOString() }])
    .select();

  if (error) throw error;
  return result?.[0];
}

export async function getTeacher(id: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllTeachers() {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateTeacher(id: string, updates: Record<string, any>) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("teachers")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteTeacher(id: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.from("teachers").delete().eq("id", id);
  if (error) throw error;
}

/**
 * STUDENTS TABLE
 */
export async function createStudent(data: {
  name: string;
  email?: string;
  program?: string;
  duration_weeks?: number;
  sessions_per_week?: number;
  class_name?: string;
}) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: result, error } = await supabase
    .from("students")
    .insert([{ ...data, created_at: new Date().toISOString() }])
    .select();

  if (error) throw error;
  return result?.[0];
}

export async function getStudent(id: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllStudents() {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getStudentsByClass(className: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("class_name", className)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateStudent(id: string, updates: Record<string, any>) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteStudent(id: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw error;
}

/**
 * SESSIONS TABLE
 */
export async function createSession(data: {
  teacher_id?: string;
  title?: string;
  starts_at: string;
  ends_at?: string;
  class_name?: string;
  description?: string;
}) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: result, error } = await supabase
    .from("sessions")
    .insert([{ ...data, created_at: new Date().toISOString() }])
    .select();

  if (error) throw error;
  return result?.[0];
}

export async function getSession(id: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllSessions() {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getSessionsByTeacher(teacherId: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getSessionsByDateRange(startDate: string, endDate: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .gte("starts_at", startDate)
    .lte("starts_at", endDate)
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateSession(id: string, updates: Record<string, any>) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteSession(id: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

/**
 * ATTENDANCE TABLE
 */
export async function recordAttendance(data: {
  session_id: string;
  student_id: string;
  status: "present" | "absent" | "late";
  notes?: string;
}) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: result, error } = await supabase
    .from("attendance")
    .insert([{ ...data, noted_at: new Date().toISOString() }])
    .select();

  if (error) throw error;
  return result?.[0];
}

export async function getAttendanceRecord(sessionId: string, studentId: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("session_id", sessionId)
    .eq("student_id", studentId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data || null;
}

export async function getSessionAttendance(sessionId: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("session_id", sessionId);

  if (error) throw error;
  return data;
}

export async function getStudentAttendance(studentId: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .order("noted_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateAttendance(sessionId: string, studentId: string, updates: Record<string, any>) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("attendance")
    .update(updates)
    .eq("session_id", sessionId)
    .eq("student_id", studentId)
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteAttendance(sessionId: string, studentId: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("session_id", sessionId)
    .eq("student_id", studentId);

  if (error) throw error;
}

/**
 * ATTENDANCE STATISTICS
 */
export async function getStudentAttendanceStats(studentId: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", studentId);

  if (error) throw error;

  const total = data?.length || 0;
  const present = data?.filter((a: any) => a.status === "present").length || 0;
  const absent = data?.filter((a: any) => a.status === "absent").length || 0;
  const late = data?.filter((a: any) => a.status === "late").length || 0;

  return {
    total,
    present,
    absent,
    late,
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
  };
}

export async function getTeacherAttendanceStats(teacherId: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Get all sessions for this teacher
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id")
    .eq("teacher_id", teacherId);

  if (sessionsError) throw sessionsError;

  const sessionIds = sessions?.map((s: any) => s.id) || [];
  if (sessionIds.length === 0) {
    return {
      totalSessions: 0,
      totalStudents: 0,
      averageAttendanceRate: 0,
    };
  }

  // Get all attendance records for these sessions
  const { data: attendances, error: attendanceError } = await supabase
    .from("attendance")
    .select("*")
    .in("session_id", sessionIds);

  if (attendanceError) throw attendanceError;

  const present = attendances?.filter((a: any) => a.status === "present").length || 0;
  const total = attendances?.length || 0;

  return {
    totalSessions: sessionIds.length,
    totalRecords: total,
    presentCount: present,
    averageAttendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
  };
}
