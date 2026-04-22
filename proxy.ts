import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

/**
 * Next.js Proxy for auth protection (Next.js 16+)
 *
 * Production-grade features:
 * - Redirects unauthenticated users from /dashboard to /login
 * - Redirects authenticated users from /login,/register to /dashboard
 * - Allows public files, API routes, and auth pages
 *
 * CRITICAL: Named 'proxy' to match proxy.ts filename for Next.js 16+
 * Next.js looks for: export function proxy(request: NextRequest)
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth-token")?.value;

  // Allow api, static files, and auth pages
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/(auth)") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
