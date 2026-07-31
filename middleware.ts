import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSuperadminMetadata, normalizeOrgRole } from "@/lib/auth/roles";

const protectedRoutes = [
  "/dashboard",
  "/dashboard/attendance",
  "/dashboard/profile",
  "/dashboard/settings",
  "/dashboard/teacher",
  "/dashboard/students",
  "/dashboard/teachers",
  "/dashboard/courses",
  "/dashboard/sessions",
  "/dashboard/enrollments",
];

const authRoutes = ["/login", "/signup"];
const teacherAllowedRoutes = [
  "/dashboard/teacher",
  "/dashboard/attendance",
  "/dashboard/sessions",
  "/dashboard/students",
  "/dashboard/courses",
  "/dashboard/enrollments",
  "/dashboard/feedback",
  "/dashboard/profile",
  "/dashboard/settings",
];

type MetadataMap = Record<string, unknown>;

function isProtected(pathname: string) {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

function isAuthPage(pathname: string) {
  return authRoutes.some((route) => pathname.startsWith(route));
}

function isTeacherRouteAllowed(pathname: string) {
  return teacherAllowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function asMetadataMap(input: unknown): MetadataMap {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as MetadataMap;
  }
  return {};
}

function readString(map: MetadataMap, key: string) {
  const value = map[key];
  return typeof value === "string" ? value : null;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const appMeta = asMetadataMap(user?.app_metadata);
  const userMeta = asMetadataMap(user?.user_metadata);
  const isSuperadmin = isSuperadminMetadata(readString(appMeta, "role") || readString(userMeta, "role"));

  let role: string | null = null;
  if (user) {
    if (isSuperadmin) {
      role = "superadmin";
    } else {
      const activeOrgId =
        request.cookies.get("vam_active_org")?.value ||
        readString(appMeta, "org_id") ||
        readString(userMeta, "default_org_id") ||
        null;
      if (activeOrgId) {
        const { data: membershipRow } = await supabase
          .from("memberships")
          .select("role")
          .eq("org_id", activeOrgId)
          .eq("user_id", user.id)
          .maybeSingle();
        role = normalizeOrgRole(membershipRow?.role as string | undefined);
      }
    }
  }

  if (isProtected(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage(pathname) && user) {
    // If teacher, send to teacher dashboard
    if (role === "teacher") {
      return NextResponse.redirect(new URL("/dashboard/teacher", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user) {
    const orgId = readString(appMeta, "org_id") || readString(userMeta, "default_org_id") || null;
    const orgName = readString(appMeta, "org_name") || readString(userMeta, "org_name") || "Primary Organization";

    if (orgId) {
      response.cookies.set("vam_active_org", String(orgId), {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
      response.cookies.set("vam_active_org_name", String(orgName), {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }

  // Restrict teachers to their dashboard only
  if (role === "teacher" && pathname.startsWith("/dashboard") && !isTeacherRouteAllowed(pathname)) {
    return NextResponse.redirect(new URL("/dashboard/teacher", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
