import { betterAuth } from "better-auth";
import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { passwordHash, passwordVerify } from "./password";
import { sendResendEmail } from "@/lib/api/email-utils";

let instance: ReturnType<typeof createAuth> | undefined;
export function createAuth(pool = getPool()) {
  const baseURL =
    process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (
    !baseURL ||
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32
  ) {
    throw new Error(
      "BETTER_AUTH_URL and a BETTER_AUTH_SECRET of at least 32 characters are required",
    );
  }
  return betterAuth({
    appName: "VAM Attendance",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: pool,
    trustedOrigins: [new URL(baseURL).origin],
    user: {
      modelName: "auth_users",
      additionalFields: {
        appMetadata: {
          type: "json",
          fieldName: "app_metadata",
          input: false,
          returned: false,
        },
        userMetadata: {
          type: "json",
          fieldName: "user_metadata",
          input: false,
          returned: false,
        },
      },
    },
    account: { modelName: "auth_accounts" },
    session: {
      modelName: "auth_sessions",
      expiresIn: 60 * 60 * 24 * 7,
      cookieCache: { enabled: false },
    },
    verification: { modelName: "auth_verifications" },
    advanced: {
      database: { generateId: () => randomUUID() },
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    emailVerification: {
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendResendEmail({
          to: user.email,
          subject: "Verify your VAM Attendance email",
          text: `Verify your email: ${url}`,
          html: `<p><a href="${url.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">Verify email</a></p>`,
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      disableSignUp: true,
      revokeSessionsOnPasswordReset: true,
      password: { hash: passwordHash, verify: passwordVerify },
      sendResetPassword: async ({ user, url }) => {
        await sendResendEmail({
          to: user.email,
          subject: "Set your VAM Attendance password",
          text: `Use this link to set your password: ${url}\nIf you did not request this, ignore this email.`,
          html: `<p>Use the link below to set your VAM Attendance password.</p><p><a href="${url.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">Set password</a></p><p>If you did not request this, ignore this email.</p>`,
        });
      },
    },
  });
}
export function getAuth() {
  return (instance ??= createAuth());
}
