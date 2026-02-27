import { NextResponse, type NextRequest } from "next/server";
import { RateLimiter, preventCommandInjection } from "@/lib/security";

// Create rate limiters for different endpoints
const loginLimiter = new RateLimiter(60000, 5); // 5 attempts per minute
const generalLimiter = new RateLimiter(60000, 100); // 100 requests per minute

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
             request.headers.get("x-real-ip") || 
             "unknown";

  // Apply stricter rate limiting to auth endpoints
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/signup")) {
    if (!loginLimiter.isAllowed(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Apply general rate limiting to all API routes
  if (pathname.startsWith("/api/")) {
    if (!generalLimiter.isAllowed(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Validate query parameters against command injection
  const searchParams = request.nextUrl.searchParams;
  for (const [key, value] of searchParams.entries()) {
    if (!preventCommandInjection(value)) {
      return NextResponse.json(
        { error: "Invalid query parameter detected" },
        { status: 400 }
      );
    }
  }

  // Add security headers to response
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
