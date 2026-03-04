import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";

type SendTeacherSetupEmailInput = {
  service: SupabaseClient;
  teacherEmail: string;
  teacherName?: string | null;
  organizationName?: string | null;
};

type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type EmailTemplate = Omit<OutboundEmail, "to">;

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

function buildEmail({
  teacherName,
  organizationName,
  setupLink,
}: {
  teacherName?: string | null;
  organizationName?: string | null;
  setupLink: string;
}): EmailTemplate {
  const displayName = teacherName?.trim() || "there";
  const orgDisplay = organizationName?.trim() || "your organization";
  const safeName = escapeHtml(displayName);
  const safeOrg = escapeHtml(orgDisplay);
  const safeLink = escapeHtml(setupLink);

  const subject = `Set up your ${orgDisplay} teacher account`;
  const text = [
    `Hi ${displayName},`,
    "",
    `You were added as a teacher in ${orgDisplay} on VAM Attendance.`,
    "Use the link below to set your password:",
    setupLink,
    "",
    "If you were not expecting this email, you can ignore it.",
  ].join("\n");

  const html = `
  <div style="font-family:Manrope,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
    <h2 style="margin:0 0 12px;font-size:22px;line-height:1.25;">Welcome to VAM Attendance</h2>
    <p style="margin:0 0 10px;font-size:15px;line-height:1.6;">Hi ${safeName},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
      You were added as a teacher in <strong>${safeOrg}</strong>. Use the button below to set your password.
    </p>
    <p style="margin:20px 0;">
      <a href="${safeLink}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-size:14px;font-weight:600;">
        Set Up Password
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#475569;">
      If the button does not work, copy and paste this link:
    </p>
    <p style="margin:0 0 14px;font-size:13px;line-height:1.6;word-break:break-word;color:#0369a1;">
      ${safeLink}
    </p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
      If you were not expecting this email, you can ignore it.
    </p>
  </div>`;

  return { subject, html, text };
}

async function sendWithResend(email: OutboundEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.TEACHER_SETUP_EMAIL_FROM?.trim() || process.env.EMAIL_FROM?.trim();
  const replyTo = process.env.TEACHER_SETUP_EMAIL_REPLY_TO?.trim() || undefined;

  if (!apiKey || !from) {
    throw new ApiError(
      "Teacher setup email is not configured. Set RESEND_API_KEY and TEACHER_SETUP_EMAIL_FROM (or EMAIL_FROM).",
      500,
      "TEACHER_SETUP_EMAIL_NOT_CONFIGURED"
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
      "Failed to send teacher setup email",
      502,
      "TEACHER_SETUP_EMAIL_SEND_FAILED",
      details
    );
  }
}

export async function sendTeacherSetupEmail({
  service,
  teacherEmail,
  teacherName,
  organizationName,
}: SendTeacherSetupEmailInput) {
  const appBaseUrl = getAppBaseUrl();
  const redirectTo = appBaseUrl ? `${appBaseUrl}/auth/reset-password` : undefined;

  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email: teacherEmail.trim().toLowerCase(),
    options: redirectTo ? { redirectTo } : undefined,
  });

  if (error || !data?.properties?.action_link) {
    throw new ApiError(
      "Failed to generate teacher setup link",
      500,
      "TEACHER_SETUP_LINK_GENERATION_FAILED",
      error?.message
    );
  }

  const composed = buildEmail({
    teacherName,
    organizationName,
    setupLink: data.properties.action_link,
  });

  await sendWithResend({
    ...composed,
    to: teacherEmail.trim().toLowerCase(),
  });
}
