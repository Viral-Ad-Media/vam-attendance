// File: app/types/attendance.ts
export type AttendanceRow = {
  date: string;            // e.g., 2025-10-01
  teacher: string;         // teacher name
  student: string;         // student name
  session_id?: string;     // optional
  status?: string;         // "Present" | "Absent" | "present"/"absent" | "1"/"0"
};

export type TeacherSummary = {
  teacher: string;
  uniqueStudents: number;
  totalSessions: number;       // entries for this teacher
  presentCount: number;
  attendanceRate: number | null; // present/total (0-1)
};

export type StudentSummary = {
  student: string;
  teacher: string;
  sessionsAttended: number;
  totalSessions: number;
  attendanceRate: number | null;
};
