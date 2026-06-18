import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const defaultCsvPath = path.join(projectRoot, "database/seed-data/amazon-walmart-schedule.csv");
const seedProgram = "Amazon/Walmart Session";
const classColumns = [
  "1st CLASS",
  "2nd CLASS",
  "3rd CLASS",
  "4th CLASS",
  "5th CLASS",
  "6th CLASS",
  "7th CLASS",
  "8th CLASS",
];
const weekdays = new Map([
  ["sunday", 0],
  ["monday", 1],
  ["tuesday", 2],
  ["wednesday", 3],
  ["thursday", 4],
  ["friday", 5],
  ["saturday", 6],
]);

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const explicitEnv = new Set(Object.keys(process.env));
  loadEnvFile(path.join(projectRoot, ".env"), explicitEnv);
  loadEnvFile(path.join(projectRoot, ".env.local"), explicitEnv);

  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const csvPath = path.resolve(projectRoot, args.file ?? defaultCsvPath);
  const startDate = args.startDate ?? process.env.SEED_START_DATE ?? "2026-01-05";
  const timezoneOffset = args.timezoneOffset ?? process.env.SEED_TIMEZONE_OFFSET ?? "+00:00";

  assertDate(startDate, "SEED_START_DATE");
  assertTimezoneOffset(timezoneOffset);

  const records = readCsv(csvPath);
  const seed = buildSeed(records, { startDate, timezoneOffset });

  printSummary(seed, { csvPath, startDate, timezoneOffset });

  if (args.dryRun) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const orgId = args.orgId ?? process.env.SEED_ORG_ID;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }
  if (!orgId) {
    throw new Error("Missing target org. Set SEED_ORG_ID or pass --org-id=<uuid>.");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "vam-amazon-walmart-seed" } },
  });

  await assertOrgExists(supabase, orgId);
  const result = await seedSupabase(supabase, orgId, seed);

  console.log("");
  console.log("Seed complete:");
  console.log(`- Teachers upserted: ${result.teachers}`);
  console.log(`- Students upserted: ${result.students}`);
  console.log(`- Courses ready: ${result.courses}`);
  console.log(`- Sessions ready: ${result.sessions}`);
  console.log(`- Enrollments upserted: ${result.enrollments}`);
  console.log(`- Attendance rows upserted: ${result.attendance}`);
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    file: null,
    help: false,
    orgId: null,
    startDate: null,
    timezoneOffset: null,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg.startsWith("--file=")) args.file = arg.slice("--file=".length);
    else if (arg.startsWith("--org-id=")) args.orgId = arg.slice("--org-id=".length);
    else if (arg.startsWith("--start-date=")) args.startDate = arg.slice("--start-date=".length);
    else if (arg.startsWith("--timezone-offset=")) {
      args.timezoneOffset = arg.slice("--timezone-offset=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Seed Amazon/Walmart schedule data into Supabase.

Usage:
  npm run seed:amazon-walmart -- --dry-run
  SEED_ORG_ID=<org-id> npm run seed:amazon-walmart

Options:
  --dry-run                    Parse the CSV and print the planned seed counts.
  --file=<path>                Use a different CSV file.
  --org-id=<uuid>              Target organization id. Defaults to SEED_ORG_ID.
  --start-date=<YYYY-MM-DD>    First week anchor date. Defaults to SEED_START_DATE or 2026-01-05.
  --timezone-offset=<+HH:MM>   Offset applied to class times. Defaults to SEED_TIMEZONE_OFFSET or +00:00.
`);
}

function loadEnvFile(filePath, explicitEnv) {
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!explicitEnv.has(key)) process.env[key] = value;
  }
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const record = { __rowNumber: index + 2 };
    headers.forEach((header, valueIndex) => {
      record[header] = (values[valueIndex] ?? "").trim();
    });
    return record;
  });
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function buildSeed(records, config) {
  const warnings = [];
  const teacherBySlug = new Map();
  const studentBySlug = new Map();
  const scheduleByKey = new Map();

  for (const record of records) {
    const name = normalizeText(record.NAMES);
    if (!name) {
      warnings.push(`Skipped row ${record.__rowNumber}: missing student name.`);
      continue;
    }

    const coach = normalizeCoach(record.COACH);
    if (coach) {
      const teacherSlug = slugify(coach);
      teacherBySlug.set(teacherSlug, {
        key: teacherSlug,
        name: coach,
        email: `${teacherSlug}@seed.vam.local`,
      });
    } else if (normalizeText(record.COACH)) {
      warnings.push(`Row ${record.__rowNumber} (${name}) has placeholder coach "${record.COACH}".`);
    }

    const schedule = parseSchedule(record, coach, config, warnings);
    const studentSlug = slugify(name);
    const existingStudent = studentBySlug.get(studentSlug);
    const statuses = readClassStatuses(record);

    if (existingStudent) {
      existingStudent.sourceRows.push(record.__rowNumber);
      warnings.push(
        `Merged duplicate student "${name}" from row ${record.__rowNumber} into row ${existingStudent.sourceRows[0]}.`
      );
    } else {
      studentBySlug.set(studentSlug, {
        key: studentSlug,
        name,
        email: `${studentSlug}@seed.vam.local`,
        onboarded: normalizeText(record.ONBOARDED).toUpperCase() === "YES",
        scheduleKey: schedule?.key ?? null,
        statuses,
        sourceRows: [record.__rowNumber],
      });
    }

    if (!schedule) continue;

    const student = studentBySlug.get(studentSlug);
    student.scheduleKey ??= schedule.key;
    student.statuses = mergeStatuses(student.statuses, statuses);

    if (!scheduleByKey.has(schedule.key)) scheduleByKey.set(schedule.key, schedule);
    scheduleByKey.get(schedule.key).studentKeys.add(studentSlug);
  }

  for (const schedule of scheduleByKey.values()) {
    schedule.sessions = buildSessions(schedule, config);
    schedule.durationWeeks = Math.max(1, Math.ceil(classColumns.length / schedule.days.length));
  }

  return {
    teachers: [...teacherBySlug.values()].sort(byName),
    students: [...studentBySlug.values()].sort(byName),
    schedules: [...scheduleByKey.values()].sort((a, b) => a.title.localeCompare(b.title)),
    warnings,
  };
}

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeCoach(value) {
  const coach = normalizeText(value);
  if (!coach) return null;
  if (coach.toLowerCase() === "coach's name") return null;
  return coach;
}

function parseSchedule(record, coach, config, warnings) {
  const dayNames = [record["DAY 1"], record["DAY 2"]].map(normalizeText).filter(Boolean);
  const days = [];
  for (const dayName of dayNames) {
    const dayNumber = weekdays.get(dayName.toLowerCase());
    if (dayNumber === undefined) {
      warnings.push(`Row ${record.__rowNumber} (${record.NAMES}) has unknown day "${dayName}".`);
    } else {
      days.push({ name: dayName, number: dayNumber });
    }
  }

  const times = normalizeTimeList(record.TIME, days.length, warnings, record);
  if (!days.length || !times.length) {
    if (normalizeText(record.TIME) || days.length) {
      warnings.push(`Row ${record.__rowNumber} (${record.NAMES}) has an incomplete schedule.`);
    }
    return null;
  }

  const coachSlug = coach ? slugify(coach) : "unassigned";
  const daySlug = days.map((day) => slugify(day.name)).join("-");
  const timeSlug = times.map((time) => time.replace(":", "")).join("-");
  const key = `${coachSlug}:${daySlug}:${timeSlug}`;
  const dayLabel = days.map((day) => day.name).join(" & ");
  const timeLabel = times.join("/");
  const teacherName = coach ?? "Unassigned";

  return {
    key,
    coach,
    teacherKey: coach ? coachSlug : null,
    title: `${seedProgram} - ${teacherName} - ${dayLabel} ${timeLabel}`,
    className: `${dayLabel} ${timeLabel}`,
    days,
    times,
    startDate: config.startDate,
    timezoneOffset: config.timezoneOffset,
    studentKeys: new Set(),
    sessions: [],
    durationWeeks: 1,
  };
}

function normalizeTimeList(value, dayCount, warnings, record) {
  const rawTimes = normalizeText(value)
    .split("/")
    .map((time) => normalizeText(time))
    .filter(Boolean);

  if (!rawTimes.length) return [];

  const normalized = rawTimes
    .map((time) => normalizeTime(time))
    .filter((time) => {
      if (time) return true;
      warnings.push(`Row ${record.__rowNumber} (${record.NAMES}) has invalid time "${record.TIME}".`);
      return false;
    });

  if (!normalized.length || !dayCount) return normalized;

  return Array.from({ length: dayCount }, (_, index) => normalized[index] ?? normalized[0]);
}

function normalizeTime(value) {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours > 23 || minutes > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function readClassStatuses(record) {
  return classColumns.map((column) => normalizeText(record[column]).toUpperCase() === "TRUE");
}

function mergeStatuses(existing, incoming) {
  return existing.map((status, index) => status || incoming[index]);
}

function buildSessions(schedule, config) {
  return classColumns.map((_, classIndex) => {
    const dayIndex = classIndex % schedule.days.length;
    const weekOffset = Math.floor(classIndex / schedule.days.length);
    const date = dateForWeekday(config.startDate, schedule.days[dayIndex].number, weekOffset);
    const startsAt = toIsoWithOffset(date, schedule.times[dayIndex], config.timezoneOffset);
    const endsAt = new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();

    return {
      classIndex,
      title: `${seedProgram} - Class ${classIndex + 1}`,
      starts_at: startsAt,
      ends_at: endsAt,
      class_name: schedule.className,
      description: `Seeded from ${seedProgram} CSV.`,
    };
  });
}

function dateForWeekday(startDate, weekday, weekOffset) {
  const base = new Date(`${startDate}T12:00:00Z`);
  const baseDay = base.getUTCDay();
  const dayDiff = (weekday - baseDay + 7) % 7 + weekOffset * 7;
  base.setUTCDate(base.getUTCDate() + dayDiff);
  return base.toISOString().slice(0, 10);
}

function toIsoWithOffset(date, time, offset) {
  return new Date(`${date}T${time}:00${offset}`).toISOString();
}

function slugify(value) {
  const slug = normalizeText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "seed";
}

function byName(a, b) {
  return a.name.localeCompare(b.name);
}

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new Error(`${label} must be a valid YYYY-MM-DD date.`);
  }
}

function assertTimezoneOffset(value) {
  if (value === "Z") return;
  if (!/^[+-]\d{2}:\d{2}$/.test(value)) {
    throw new Error("SEED_TIMEZONE_OFFSET must be Z or a +HH:MM/-HH:MM offset.");
  }
}

function printSummary(seed, config) {
  const scheduledStudents = seed.students.filter((student) => student.scheduleKey).length;
  const sessionCount = seed.schedules.reduce((sum, schedule) => sum + schedule.sessions.length, 0);

  console.log("Amazon/Walmart seed summary:");
  console.log(`- CSV: ${path.relative(projectRoot, config.csvPath)}`);
  console.log(`- Start date: ${config.startDate}`);
  console.log(`- Timezone offset: ${config.timezoneOffset}`);
  console.log(`- Teachers: ${seed.teachers.length}`);
  console.log(`- Students: ${seed.students.length}`);
  console.log(`- Schedule courses: ${seed.schedules.length}`);
  console.log(`- Sessions: ${sessionCount}`);
  console.log(`- Enrollments: ${scheduledStudents}`);
  console.log(`- Attendance rows: ${scheduledStudents * classColumns.length}`);

  if (seed.warnings.length) {
    console.log("");
    console.log("Warnings:");
    for (const warning of seed.warnings) console.log(`- ${warning}`);
  }
}

async function assertOrgExists(supabase, orgId) {
  const { data, error } = await supabase.from("organizations").select("id").eq("id", orgId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Organization not found: ${orgId}`);
}

async function seedSupabase(supabase, orgId, seed) {
  const teacherIds = await upsertTeachers(supabase, orgId, seed.teachers);
  const studentIds = await upsertStudents(supabase, orgId, seed.students, seed.schedules);
  const courseIds = await upsertCourses(supabase, orgId, seed.schedules, teacherIds);
  const sessionIds = await upsertSessions(supabase, orgId, seed.schedules, courseIds, teacherIds);
  const enrollmentCount = await upsertEnrollments(supabase, orgId, seed, studentIds, courseIds, teacherIds);
  const attendanceCount = await upsertAttendance(supabase, orgId, seed, studentIds, sessionIds);

  return {
    teachers: seed.teachers.length,
    students: seed.students.length,
    courses: seed.schedules.length,
    sessions: [...sessionIds.values()].reduce((sum, sessions) => sum + sessions.size, 0),
    enrollments: enrollmentCount,
    attendance: attendanceCount,
  };
}

async function upsertTeachers(supabase, orgId, teachers) {
  if (!teachers.length) return new Map();

  const rows = teachers.map((teacher) => ({
    org_id: orgId,
    name: teacher.name,
    email: teacher.email,
  }));

  const { data, error } = await supabase
    .from("teachers")
    .upsert(rows, { onConflict: "org_id,email" })
    .select("id,email");
  if (error) throw error;

  return new Map((data ?? []).map((teacher) => [teacher.email, teacher.id]));
}

async function upsertStudents(supabase, orgId, students, schedules) {
  if (!students.length) return new Map();

  const scheduleByKey = new Map(schedules.map((schedule) => [schedule.key, schedule]));
  const rows = students.map((student) => {
    const schedule = student.scheduleKey ? scheduleByKey.get(student.scheduleKey) : null;
    return {
      org_id: orgId,
      name: student.name,
      email: student.email,
      program: seedProgram,
      duration_weeks: schedule?.durationWeeks ?? null,
      sessions_per_week: schedule?.days.length ?? null,
      class_name: schedule?.className ?? (student.onboarded ? "Onboarded" : "Not onboarded"),
    };
  });

  const { data, error } = await supabase
    .from("students")
    .upsert(rows, { onConflict: "org_id,email" })
    .select("id,email");
  if (error) throw error;

  return new Map((data ?? []).map((student) => [student.email, student.id]));
}

async function upsertCourses(supabase, orgId, schedules, teacherIds) {
  if (!schedules.length) return new Map();

  const titles = schedules.map((schedule) => schedule.title);
  const { data: existing, error: existingError } = await supabase
    .from("courses")
    .select("id,title")
    .eq("org_id", orgId)
    .in("title", titles);
  if (existingError) throw existingError;

  const courseIds = new Map((existing ?? []).map((course) => [course.title, course.id]));

  for (const schedule of schedules) {
    const firstSession = schedule.sessions[0];
    const lastSession = schedule.sessions[schedule.sessions.length - 1];
    const payload = {
      org_id: orgId,
      title: schedule.title,
      description: `Seeded from ${seedProgram} CSV.`,
      modality: "group",
      lead_teacher_id: schedule.teacherKey
        ? teacherIds.get(`${schedule.teacherKey}@seed.vam.local`) ?? null
        : null,
      course_type: seedProgram,
      duration_weeks: schedule.durationWeeks,
      sessions_per_week: schedule.days.length,
      max_students: schedule.studentKeys.size,
      starts_at: firstSession?.starts_at ?? null,
      ends_at: lastSession?.ends_at ?? null,
    };

    const existingId = courseIds.get(schedule.title);
    if (existingId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", existingId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("courses").insert(payload).select("id").single();
      if (error) throw error;
      courseIds.set(schedule.title, data.id);
    }
  }

  return new Map(schedules.map((schedule) => [schedule.key, courseIds.get(schedule.title)]));
}

async function upsertSessions(supabase, orgId, schedules, courseIds, teacherIds) {
  const idsBySchedule = new Map();
  if (!schedules.length) return idsBySchedule;

  const courseIdValues = [...courseIds.values()].filter(Boolean);
  const { data: existing, error: existingError } = await supabase
    .from("sessions")
    .select("id,course_id,title")
    .in("course_id", courseIdValues);
  if (existingError) throw existingError;

  const existingByCourseAndTitle = new Map(
    (existing ?? []).map((session) => [`${session.course_id}:${session.title}`, session.id])
  );

  for (const schedule of schedules) {
    const courseId = courseIds.get(schedule.key);
    const scheduleSessionIds = new Map();
    idsBySchedule.set(schedule.key, scheduleSessionIds);

    for (const session of schedule.sessions) {
      const payload = {
        org_id: orgId,
        course_id: courseId,
        teacher_id: schedule.teacherKey
          ? teacherIds.get(`${schedule.teacherKey}@seed.vam.local`) ?? null
          : null,
        title: session.title,
        starts_at: session.starts_at,
        ends_at: session.ends_at,
        class_name: session.class_name,
        description: session.description,
      };
      const existingKey = `${courseId}:${session.title}`;
      const existingId = existingByCourseAndTitle.get(existingKey);

      if (existingId) {
        const { error } = await supabase.from("sessions").update(payload).eq("id", existingId);
        if (error) throw error;
        scheduleSessionIds.set(session.classIndex, existingId);
      } else {
        const { data, error } = await supabase.from("sessions").insert(payload).select("id").single();
        if (error) throw error;
        scheduleSessionIds.set(session.classIndex, data.id);
      }
    }
  }

  return idsBySchedule;
}

async function upsertEnrollments(supabase, orgId, seed, studentIds, courseIds, teacherIds) {
  const rows = [];

  for (const schedule of seed.schedules) {
    const courseId = courseIds.get(schedule.key);
    const teacherId = schedule.teacherKey ? teacherIds.get(`${schedule.teacherKey}@seed.vam.local`) ?? null : null;

    for (const studentKey of schedule.studentKeys) {
      const student = seed.students.find((candidate) => candidate.key === studentKey);
      if (!student) continue;
      rows.push({
        org_id: orgId,
        student_id: studentIds.get(student.email),
        course_id: courseId,
        teacher_id: teacherId,
        status: student.onboarded ? "active" : "paused",
      });
    }
  }

  if (!rows.length) return 0;

  const { error } = await supabase
    .from("enrollments")
    .upsert(rows, { onConflict: "org_id,student_id,course_id" });
  if (error) throw error;

  return rows.length;
}

async function upsertAttendance(supabase, orgId, seed, studentIds, sessionIds) {
  const rows = [];

  for (const schedule of seed.schedules) {
    const scheduleSessionIds = sessionIds.get(schedule.key);
    for (const studentKey of schedule.studentKeys) {
      const student = seed.students.find((candidate) => candidate.key === studentKey);
      if (!student) continue;

      student.statuses.forEach((present, classIndex) => {
        rows.push({
          org_id: orgId,
          session_id: scheduleSessionIds.get(classIndex),
          student_id: studentIds.get(student.email),
          status: present ? "present" : "absent",
          notes: `Seeded from ${seedProgram} CSV class ${classIndex + 1}.`,
        });
      });
    }
  }

  if (!rows.length) return 0;

  const { error } = await supabase.from("attendance").upsert(rows, {
    onConflict: "org_id,session_id,student_id",
  });
  if (error) throw error;

  return rows.length;
}
