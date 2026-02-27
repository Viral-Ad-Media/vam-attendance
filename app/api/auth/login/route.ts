// app/api/auth/login/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );
    }

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const meta = data.user?.app_metadata || {};
    const userMeta = data.user?.user_metadata || {};
    const orgId = (meta as any).org_id || (userMeta as any).default_org_id || null;
    const orgName = (meta as any).org_name || (userMeta as any).org_name || "Primary Organization";
    if (orgId) {
      cookieStore.set("vam_active_org", String(orgId), {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
      cookieStore.set("vam_active_org_name", String(orgName), {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json(
      {
        message: "Login successful",
        user: data.user,
        session: data.session,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
