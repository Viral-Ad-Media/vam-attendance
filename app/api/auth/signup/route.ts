import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db/pool";
import { getAuth } from "@/lib/auth/server";
import { registerAccount } from "@/lib/auth/register";
import { consumeRateLimit } from "@/lib/api/rate-limit";
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!consumeRateLimit(`signup:${ip}`, 5).allowed)
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  try {
    const { email, password, fullName } = z
      .object({
        email: z.string().trim().email(),
        password: z.string().min(8).max(128),
        fullName: z.string().trim().min(1).max(255),
      })
      .parse(await request.json());
    await registerAccount(getPool(), { email, password, fullName });
    // Sending email happens after the transaction; delivery failures never delete the account.
    try {
      await getAuth().api.sendVerificationEmail({
        body: {
          email: email.toLowerCase(),
          callbackURL: `${process.env.BETTER_AUTH_URL}/login`,
        },
        headers: request.headers,
      });
    } catch {
      return NextResponse.json(
        {
          message:
            "Account created. Verification email could not be delivered; try signing in to resend it.",
          verificationEmailSent: false,
        },
        { status: 201 },
      );
    }
    return NextResponse.json(
      {
        message: "Account created. Check your email to verify your address.",
        verificationEmailSent: true,
      },
      { status: 201 },
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid signup data"
            : code === "23505"
              ? "An account already exists for this email"
              : "Unable to create account",
      },
      {
        status:
          error instanceof z.ZodError ? 400 : code === "23505" ? 409 : 500,
      },
    );
  }
}
