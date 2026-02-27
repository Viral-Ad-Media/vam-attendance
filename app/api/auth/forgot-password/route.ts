import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

function getAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (!vercel) return undefined;

  const normalized = vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return normalized.replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const appBaseUrl = getAppBaseUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: appBaseUrl ? `${appBaseUrl}/auth/reset-password` : undefined,
    });

    // Keep response generic to avoid leaking whether an account exists.
    if (error) {
      console.error("Forgot password email error", error);
    }

    return NextResponse.json(
      { message: "If an account exists for this email, a password setup link has been sent." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
