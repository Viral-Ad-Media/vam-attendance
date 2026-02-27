import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

function readFirstRole(map: MetadataMap) {
  const roles = map.roles;
  if (Array.isArray(roles) && typeof roles[0] === "string") {
    return roles[0];
  }
  return null;
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
  const role =
    readString(appMeta, "role") ||
    readString(userMeta, "role") ||
    readFirstRole(appMeta) ||
    null;

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
