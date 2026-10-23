/**
 * Root Next.js middleware.
 *
 * The single responsibility here is keeping the Supabase session fresh:
 * `updateSession()` reads the auth cookies, lets `@supabase/ssr` refresh an
 * expired token, and writes the refreshed cookies onto the outgoing response.
 * This must run on every request that could touch an auth cookie, otherwise
 * the session silently expires mid-session and users get logged out.
 *
 * Authorization decisions are deliberately NOT made here. Middleware edge
 * cases (stale cookies, races, prefetches) make it the wrong place to enforce
 * access control — the PRD requires enforcement in Postgres RLS and, for
 * route gating, in the server-side layout (`app/dashboard/layout.tsx`) where
 * the session is refreshed and verified via `supabase.auth.getUser()`.
 *
 * When Supabase env vars are absent, `updateSession()` is a pass-through and
 * the app stays in demo mode.
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     *  - static assets (`/_next/static`, `/_next/image`, favicon, etc.)
     *  - files with an extension (e.g. `/logo.png`)
     *  - Next.js internals we never want to touch
     *
     * `updateSession` itself no-ops when Supabase is unconfigured, so this
     * matcher is purely an optimization to avoid running middleware on
     * every image request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)",
  ],
};