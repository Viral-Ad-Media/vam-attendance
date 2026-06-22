import { ApiError } from "@/lib/api/errors";

type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function getAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$|\s+$/g, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const normalized = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return normalized.replace(/\/+$|\s+$/g, "");
  }

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return undefined;
}

export async function sendResendEmail(email: OutboundEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.TEACHER_SETUP_EMAIL_FROM?.trim() ||
    process.env.STUDENT_FEEDBACK_EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new ApiError(
      "Email provider is not configured. Set RESEND_API_KEY and a valid sender email.",
      500,
      "EMAIL_PROVIDER_NOT_CONFIGURED"
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
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new ApiError(
      "Failed to send email",
      502,
      "EMAIL_SEND_FAILED",
      details
    );
  }
}
