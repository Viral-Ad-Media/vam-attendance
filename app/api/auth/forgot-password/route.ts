import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth/server";
import { consumeRateLimit } from "@/lib/api/rate-limit";
export async function POST(request: Request) {
  try {
    const { email } = z
      .object({ email: z.string().trim().email() })
      .parse(await request.json());
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!consumeRateLimit(`password-reset:${ip}`, 5).allowed)
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    await getAuth().api.requestPasswordReset({
      body: {
        email: email.toLowerCase(),
        redirectTo: `${process.env.BETTER_AUTH_URL}/auth/reset-password`,
      },
      headers: request.headers,
    });
    return NextResponse.json({
      message:
        "If an account exists for this email, a password setup link has been sent.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Please enter a valid email address"
            : "Unable to send password reset email",
      },
      { status: error instanceof z.ZodError ? 400 : 503 },
    );
  }
}
