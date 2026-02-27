// File: lib/attendance.ts
import type { AttendanceRow, TeacherSummary, StudentSummary } from "@/app/types/attendance";

export function parseAttendanceCSV(text: string): AttendanceRow[] {
  // minimal CSV parser (supports commas, simple quotes)
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const hdr = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  const idx = (nameAliases: string[]) => {
    const i = hdr.findIndex((h) => nameAliases.includes(h));
    return i >= 0 ? i : -1;
  };

  const iDate    = idx(["date","sessiondate","session_date"]);
  const iTeacher = idx(["teacher","instructor","tutor"]);
  const iStudent = idx(["student","learner","name"]);
  const iSess    = idx(["session_id","session","class_id"]);
  const iStatus  = idx(["status","attendance","present"]);

  const rows: AttendanceRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = splitCSVLine(lines[li]);
    const date = at(cols, iDate);
    const teacher = at(cols, iTeacher);
    const student = at(cols, iStudent);
    if (!teacher || !student) continue;
    rows.push({
      date: date || "",
      teacher,
      student,
      session_id: at(cols, iSess) || undefined,
      status: at(cols, iStatus) || undefined,
    });
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === "," && !inQ) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
const at = (arr: string[], idx: number) => (idx >= 0 && idx < arr.length ? arr[idx].trim() : "");

export function normalizePresent(status?: string): boolean | null {
  if (!status) return null;
  const s = status.toLowerCase().trim();
  if (["present","p","1","yes","y"].includes(s)) return true;
  if (["absent","a","0","no","n"].includes(s)) return false;
  return null;
}

export function summarizeByTeacher(rows: AttendanceRow[]): TeacherSummary[] {
  const map = new Map<string, AttendanceRow[]>();
  rows.forEach(r => {
    const key = r.teacher || "(Unknown)";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  });

  const out: TeacherSummary[] = [];
  for (const [teacher, arr] of map) {
    const students = new Set(arr.map(a => a.student).filter(Boolean));
    const present = arr.reduce((n, a) => n + (normalizePresent(a.status) ? 1 : 0), 0);
    const total = arr.length;
    out.push({
      teacher,
      uniqueStudents: students.size,
      totalSessions: total,
      presentCount: present,
      attendanceRate: total ? present / total : null,
    });
  }
  return out.sort((a,b) => b.uniqueStudents - a.uniqueStudents);
}

export function summarizeByStudent(rows: AttendanceRow[]): StudentSummary[] {
  const map = new Map<string, AttendanceRow[]>();
  rows.forEach(r => {
    const key = `${r.student}||${r.teacher}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  });

  const out: StudentSummary[] = [];
  for (const [key, arr] of map) {
    const [student, teacher] = key.split("||");
    const present = arr.reduce((n, a) => n + (normalizePresent(a.status) ? 1 : 0), 0);
    const total = arr.length;
    out.push({
      student,
      teacher,
      sessionsAttended: present,
      totalSessions: total,
      attendanceRate: total ? present / total : null,
    });
  }
  return out.sort((a,b) => b.sessionsAttended - a.sessionsAttended);
}
