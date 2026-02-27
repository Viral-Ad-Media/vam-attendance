// app/api/auth/signup/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase/service";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(1).max(255),
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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Service role key missing on server" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, password, fullName } = signupSchema.parse(body);
    const normalizedEmail = email.toLowerCase();
    const appBaseUrl = getAppBaseUrl();

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
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: appBaseUrl ? `${appBaseUrl}/login` : undefined,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      const service = getServiceClient();
      const orgName = fullName ? `${fullName}'s Org` : "New Organization";
      const userId = data.user.id;

      try {
        // Insert organization
        const { data: orgRows, error: orgErr } = await service
          .from("organizations")
          .insert([{ name: orgName, owner_id: userId }])
          .select("id")
          .single();
        if (orgErr) {
          throw orgErr;
        }
        const orgId = orgRows.id as string;

        // Membership
        const { error: membershipErr } = await service.from("memberships").insert([
          { org_id: orgId, user_id: userId, role: "owner" },
        ]);
        if (membershipErr) {
          throw membershipErr;
        }

        // Profile with org
        const { error: profileErr } = await service.from("users").insert([
          {
            id: userId,
            org_id: orgId,
            email: normalizedEmail,
            full_name: fullName,
            created_at: new Date().toISOString(),
          },
        ]);
        if (profileErr) {
          throw profileErr;
        }

        // Set default org metadata (app + user)
        const { error: metadataErr } = await service.auth.admin.updateUserById(userId, {
          app_metadata: { org_id: orgId, org_name: orgName },
          user_metadata: { default_org_id: orgId, org_name: orgName },
        });
        if (metadataErr) {
          throw metadataErr;
        }
      } catch (provisionError) {
        // Prevent orphaned auth users when org provisioning fails.
        await service.auth.admin.deleteUser(userId);
        throw provisionError;
      }
    }

    return NextResponse.json(
      { message: "Signup successful. Please check your email to confirm." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid signup data", details: error.errors }, { status: 400 });
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
