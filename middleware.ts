import { NextResponse, type NextRequest } from "next/server";
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    path !== "/api/billing/webhook"
  ) {
    const origin = request.headers.get("origin");
    const expected = process.env.BETTER_AUTH_URL;
    if (origin && (!expected || origin !== new URL(expected).origin)) {
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 },
      );
    }
  }
  // This is only a navigation hint. Server layout and API routes validate the
  // Better Auth session against Neon before returning any protected data.
  const cookie =
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("better-auth.session_token")?.value;
  if (request.nextUrl.pathname.startsWith("/dashboard") && !cookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
