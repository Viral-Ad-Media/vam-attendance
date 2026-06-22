import { ApiError } from "@/lib/api/errors";
import { getAppBaseUrl, sendResendEmail } from "./email-utils";

export function buildInviteEmail({
  inviteEmail,
  organizationName,
  token,
  role,
}: {
  inviteEmail: string;
  organizationName?: string | null;
  token: string;
  role: string;
}) {
  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) {
    throw new ApiError(
      "App URL is not configured for invite links. Set NEXT_PUBLIC_APP_URL.",
      500,
      "INVITE_APP_URL_MISSING"
    );
  }

  const inviteUrl = `${appBaseUrl}/invite/${token}`;
  const organizationLabel = organizationName?.trim() || "VAM Attendance";
  const displayEmail = inviteEmail.trim();
  const safeUrl = inviteUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const subject = `You're invited to join ${organizationLabel}`;
  const text = [
    `Hi ${displayEmail},`,
    "",
    `${organizationLabel} invited you to join their attendance workspace as a ${role}.`,
    "Use the link below to accept the invitation:",
    inviteUrl,
    "",
    "If you did not expect this invitation, you can ignore this message.",
  ].join("\n");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
    <h2 style="margin:0 0 12px;font-size:22px;line-height:1.25;">Invitation to join ${organizationLabel}</h2>
    <p style="font-size:15px;line-height:1.7;">You were invited to join <strong>${organizationLabel}</strong> as a <strong>${role}</strong>.</p>
    <p style="margin:24px 0;">
      <a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">Accept invitation</a>
    </p>
    <p style="font-size:13px;line-height:1.7;color:#475569;">If the button does not work, copy and paste this link into your browser:</p>
    <p style="word-break:break-word;color:#0369a1;font-size:13px;">${safeUrl}</p>
    <p style="margin-top:24px;font-size:13px;color:#6b7280;">If you did not expect this invitation, you can safely ignore this email.</p>
  </div>`;

  return { subject, text, html };
}

export async function sendInviteEmail({
  inviteEmail,
  organizationName,
  token,
  role,
}: {
  inviteEmail: string;
  organizationName?: string | null;
  token: string;
  role: string;
}) {
  const email = buildInviteEmail({ inviteEmail, organizationName, token, role });
  await sendResendEmail({
    ...email,
    to: inviteEmail.trim().toLowerCase(),
  });
}
