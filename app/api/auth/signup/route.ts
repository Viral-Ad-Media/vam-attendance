// app/api/auth/signup/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: appUrl ? `${appUrl}/login` : undefined,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create org + membership + profile with service role (bypass RLS)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Service role key missing on server" },
        { status: 500 }
      );
    }

    if (data.user) {
      const service = getServiceClient();
      const orgName = fullName ? `${fullName}'s Org` : "New Organization";
      // Insert organization
      const { data: orgRows, error: orgErr } = await service
        .from("organizations")
        .insert([{ name: orgName, owner_id: data.user.id }])
        .select("id")
        .single();
      if (orgErr) {
        return NextResponse.json({ error: orgErr.message }, { status: 400 });
      }
      const orgId = orgRows.id as string;

      // Membership
      await service.from("memberships").insert([
        { org_id: orgId, user_id: data.user.id, role: "owner" },
      ]);

      // Profile with org
      await service.from("users").insert([
        {
          id: data.user.id,
          org_id: orgId,
          email,
          full_name: fullName,
          created_at: new Date().toISOString(),
        },
      ]);

      // Set default org metadata (app + user)
      await service.auth.admin.updateUserById(data.user.id, {
        app_metadata: { org_id: orgId, org_name: orgName },
        user_metadata: { default_org_id: orgId, org_name: orgName },
      });
    }

    return NextResponse.json(
      { message: "Signup successful. Please check your email to confirm." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
