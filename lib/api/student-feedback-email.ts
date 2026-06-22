import { createHash, randomBytes } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { getServiceClient } from "@/lib/supabase/service";

type AttendanceStatus = "present" | "absent" | "late";

type AttendanceRow = {
  id: string;
  org_id?: string | null;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
};

type StudentRow = {
  id: string;
  name: string;
  email?: string | null;
};

type SessionRow = {
  id: string;
  title?: string | null;
  starts_at?: string | null;
};

type OrganizationRow = {
  id: string;
  name?: string | null;
};

type FeedbackRequestRow = {
  id: string;
  submitted_at?: string | null;
};

type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type AttendanceFeedbackEmailStatus = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  requestId?: string;
  message?: string;
};

function getAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const normalized = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return normalized.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return undefined;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function hashFeedbackToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function formatSessionDate(value?: string | null) {
  if (!value) return "your recent session";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "your recent session";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildEmail({
  studentName,
  organizationName,
  sessionTitle,
  sessionDate,
  feedbackUrl,
}: {
  studentName?: string | null;
  organizationName?: string | null;
  sessionTitle?: string | null;
  sessionDate?: string | null;
  feedbackUrl: string;
}): Omit<OutboundEmail, "to"> {
  const displayName = studentName?.trim() || "there";
  const orgDisplay = organizationName?.trim() || "VAM Attendance";
  const sessionDisplay = sessionTitle?.trim() || "your session";
  const dateDisplay = sessionDate?.trim() || "your recent session";
  const safeName = escapeHtml(displayName);
  const safeOrg = escapeHtml(orgDisplay);
  const safeSession = escapeHtml(sessionDisplay);
  const safeDate = escapeHtml(dateDisplay);
  const safeUrl = escapeHtml(feedbackUrl);

  const subject = `Share feedback for ${sessionDisplay}`;
  const text = [
    `Hi ${displayName},`,
    "",
    `${orgDisplay} marked your attendance for ${sessionDisplay} (${dateDisplay}).`,
    "Please use this link to share quick feedback:",
    feedbackUrl,
    "",
    "Thank you.",
  ].join("\n");

  const html = `
  <div style="font-family:Manrope,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
    <h2 style="margin:0 0 12px;font-size:22px;line-height:1.25;">Share your session feedback</h2>
    <p style="margin:0 0 10px;font-size:15px;line-height:1.6;">Hi ${safeName},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
      <strong>${safeOrg}</strong> marked your attendance for <strong>${safeSession}</strong> (${safeDate}).
    </p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
      Please use the button below to share quick feedback about the session.
    </p>
    <p style="margin:20px 0;">
      <a href="${safeUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-size:14px;font-weight:600;">
        Open Feedback Form
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#475569;">
      If the button does not work, copy and paste this link:
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-word;color:#0369a1;">
      ${safeUrl}
    </p>
  </div>`;

  return { subject, html, text };
}

async function sendWithResend(email: OutboundEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.STUDENT_FEEDBACK_EMAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.TEACHER_SETUP_EMAIL_FROM?.trim();
  const replyTo = process.env.STUDENT_FEEDBACK_EMAIL_REPLY_TO?.trim() || undefined;

  if (!apiKey || !from) {
    throw new ApiError(
      "Student feedback email is not configured. Set RESEND_API_KEY and STUDENT_FEEDBACK_EMAIL_FROM (or EMAIL_FROM).",
      500,
      "STUDENT_FEEDBACK_EMAIL_NOT_CONFIGURED"
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new ApiError(
      "Failed to send student feedback email",
      502,
      "STUDENT_FEEDBACK_EMAIL_SEND_FAILED",
      details
    );
  }
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function sendAttendanceFeedbackRequest({
  attendance,
  orgId,
}: {
  attendance: AttendanceRow;
  orgId: string;
}): Promise<AttendanceFeedbackEmailStatus> {
  if (attendance.status === "absent") {
    return { sent: false, skipped: true, reason: "attendance_absent" };
  }

  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) {
    throw new ApiError(
      "App URL is not configured for feedback links. Set NEXT_PUBLIC_APP_URL.",
      500,
      "STUDENT_FEEDBACK_APP_URL_MISSING"
    );
  }

  const service = getServiceClient();
  const [existingResult, studentResult, sessionResult, orgResult] = await Promise.all([
    service
      .from("student_feedback_requests")
      .select("id, submitted_at")
      .eq("org_id", orgId)
      .eq("attendance_id", attendance.id)
      .maybeSingle<FeedbackRequestRow>(),
    service
      .from("students")
      .select("id, name, email")
      .eq("org_id", orgId)
      .eq("id", attendance.student_id)
      .maybeSingle<StudentRow>(),
    service
      .from("sessions")
      .select("id, title, starts_at")
      .eq("org_id", orgId)
      .eq("id", attendance.session_id)
      .maybeSingle<SessionRow>(),
    service
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle<OrganizationRow>(),
  ]);

  if (existingResult.error) throw existingResult.error;
  if (studentResult.error) throw studentResult.error;
  if (sessionResult.error) throw sessionResult.error;
  if (orgResult.error) throw orgResult.error;

  if (existingResult.data?.submitted_at) {
    return { sent: false, skipped: true, reason: "feedback_already_submitted", requestId: existingResult.data.id };
  }

  if (existingResult.data) {
    return { sent: false, skipped: true, reason: "feedback_link_already_sent", requestId: existingResult.data.id };
  }

  const student = studentResult.data;
  if (!student?.email) {
    return { sent: false, skipped: true, reason: "student_email_missing" };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashFeedbackToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: requestRow, error: requestError } = await service
    .from("student_feedback_requests")
    .insert([
      {
        org_id: orgId,
        attendance_id: attendance.id,
        student_id: attendance.student_id,
        session_id: attendance.session_id,
        token_hash: tokenHash,
        sent_to: student.email.trim().toLowerCase(),
        expires_at: expiresAt,
      },
    ])
    .select("id")
    .single<{ id: string }>();

  if (requestError) {
    if (isUniqueViolation(requestError)) {
      return { sent: false, skipped: true, reason: "feedback_link_already_sent" };
    }
    throw requestError;
  }

  const feedbackUrl = `${appBaseUrl}/feedback/${token}`;
  const session = sessionResult.data;
  const composed = buildEmail({
    studentName: student.name,
    organizationName: orgResult.data?.name,
    sessionTitle: session?.title,
    sessionDate: formatSessionDate(session?.starts_at),
    feedbackUrl,
  });

  try {
    await sendWithResend({
      ...composed,
      to: student.email.trim().toLowerCase(),
    });
  } catch (error) {
    await service.from("student_feedback_requests").delete().eq("id", requestRow.id);
    throw error;
  }

  const { error: sentError } = await service
    .from("student_feedback_requests")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", requestRow.id);
  if (sentError) throw sentError;

  return { sent: true, requestId: requestRow.id };
}

export async function resendAttendanceFeedbackRequest(
  requestId: string,
  orgId: string
): Promise<AttendanceFeedbackEmailStatus> {
  const service = getServiceClient();

  const { data: requestRow, error: requestFetchError } = await service
    .from("student_feedback_requests")
    .select("id, attendance_id, student_id, session_id, sent_to, sent_at, submitted_at, expires_at")
    .eq("org_id", orgId)
    .eq("id", requestId)
    .single();

  if (requestFetchError) throw requestFetchError;
  if (!requestRow) {
    throw new ApiError("Feedback request not found", 404, "FEEDBACK_REQUEST_NOT_FOUND");
  }
  if (requestRow.submitted_at) {
    return { sent: false, skipped: true, reason: "feedback_already_submitted", requestId };
  }

  const [studentResult, sessionResult, orgResult] = await Promise.all([
    service
      .from("students")
      .select("id, name, email")
      .eq("org_id", orgId)
      .eq("id", requestRow.student_id)
      .maybeSingle<{
        id: string;
        name?: string | null;
        email?: string | null;
      }>(),
    service
      .from("sessions")
      .select("id, title, starts_at")
      .eq("org_id", orgId)
      .eq("id", requestRow.session_id)
      .maybeSingle<{
        id: string;
        title?: string | null;
        starts_at?: string | null;
      }>(),
    service
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle<{
        id: string;
        name?: string | null;
      }>(),
  ]);

  if (studentResult.error) throw studentResult.error;
  if (sessionResult.error) throw sessionResult.error;
  if (orgResult.error) throw orgResult.error;

  const student = studentResult.data;
  if (!student?.email) {
    return { sent: false, skipped: true, reason: "student_email_missing" };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashFeedbackToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const emailUrl = `${getAppBaseUrl()}/feedback/${token}`;
  const composed = buildEmail({
    studentName: student.name,
    organizationName: orgResult.data?.name,
    sessionTitle: sessionResult.data?.title,
    sessionDate: formatSessionDate(sessionResult.data?.starts_at),
    feedbackUrl: emailUrl,
  });

  await sendWithResend({
    ...composed,
    to: student.email.trim().toLowerCase(),
  });

  const { error: updateError } = await service
    .from("student_feedback_requests")
    .update({ token_hash: tokenHash, expires_at: expiresAt, sent_at: new Date().toISOString() })
    .eq("id", requestRow.id);
  if (updateError) throw updateError;

  return { sent: true, requestId: requestRow.id };
}
