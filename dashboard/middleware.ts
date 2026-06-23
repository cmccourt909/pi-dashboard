import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers middleware.
 *
 * Adds browser security headers to all responses to protect against:
 * - Clickjacking (X-Frame-Options, CSP frame-ancestors)
 * - XSS (X-Content-Type-Options, CSP)
 * - MIME sniffing (X-Content-Type-Options)
 * - Information leakage (Referrer-Policy, Permissions-Policy)
 * - Downgrade attacks (Strict-Transport-Security)
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Enforce HTTPS (1 year, include subdomains)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // Content Security Policy — restrict resource loading
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval
      "style-src 'self' 'unsafe-inline'", // Tailwind uses inline styles
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'", // API calls are same-origin (proxied)
      "frame-ancestors 'none'", // Prevent embedding
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // Restrict browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

// Apply to all routes except static assets and API health checks
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files (svg, png, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
