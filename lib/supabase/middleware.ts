/**
 * Middleware Supabase session refresher.
 *
 * This module exports `updateSession()`, a Next.js middleware-compatible
 * helper. It:
 *   1. Reads auth cookies from the incoming request.
 *   2. Lets Supabase refresh the token if it is expired.
 *   3. Writes the refreshed cookies back onto the outgoing response.
 *
 * If Supabase env vars are missing, `updateSession()` is a no-op pass-through
 * so the demo fallback keeps working. The middleware that calls it should
 * still run its other checks (e.g. auth gating) — but those will fall back
 * to demo behaviour as well.
 *
 * IMPORTANT: this is the only place (alongside `lib/supabase/server.ts`) that
 * is allowed to write Supabase auth cookies. RSC and Route Handlers do not
 * get to write cookies, so they rely on this middleware to keep the session
 * fresh across requests.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, readPublicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase session for an incoming Next.js request. Returns the
 * (possibly augmented) NextResponse. Always returns a NextResponse — never
 * throws when env vars are missing.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Pass-through for the demo fallback: no env, no session handling.
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  const env = readPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Touching the user forces the JWT to refresh if expired. Per
  // @supabase/ssr docs, this must be called from middleware or the session
  // will become stale and auth will silently break.
  //
  // Errors here are not fatal: we still let the request through and rely on
  // server components / route handlers to gate access. This avoids a
  // dependency on Supabase being reachable for static asset paths.
  await supabase.auth.getUser().catch(() => {
    // Network or refresh failure — pass through, real check happens later.
  });

  return response;
}
