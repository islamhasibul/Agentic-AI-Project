/**
 * `/auth/callback` — Supabase email link handler.
 *
 * Supabase sends two distinct kinds of email links, and both land here:
 *
 *   1. **Confirmation / recovery links using a token hash** (the "magic link"
 *      template, used for `emailRedirectTo` links generated server-side).
 *      These arrive as `?token_hash=<hash>&type=invite|signup|recovery|...`.
 *      We call `supabase.auth.verifyOtp({ token_hash, type })`, which
 *      establishes the session as a side effect and writes cookies through the
 *      `getServerSupabase()` cookie adapter.
 *
 *   2. **PKCE links** (the default Supabase email template, and what
 *      `signInWithOtp` / magic links produce). These arrive as `?code=<pkce>`
 *      and require `exchangeCodeForSession(code)`.
 *
 * Both are supported here. Anything else redirects to `/login` with a
 * descriptive error rather than throwing a 500 at the end user.
 *
 * Security notes:
 *   - `next` is never trusted: it is passed through `safeRedirectPath()`, which
 *     only permits same-origin rooted paths.
 *   - The response is built by re-using the `NextResponse` object that the
 *     cookie adapter wrote refreshed session cookies onto, so the newly
 *     established session is not lost during the redirect.
 *   - This route is intentionally tolerant of missing Supabase config so the
 *     demo build keeps working; in that case it bounces to `/login`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, readPublicEnv } from "@/lib/env";
import { safeRedirectPath } from "@/lib/redirect";

const DEFAULT_NEXT = "/dashboard";

/** Log the user in and continue to a validated `next` path. */
function continueTo(request: NextRequest, target: string): NextResponse {
  const next = safeRedirectPath(target, DEFAULT_NEXT);
  // Rewrite instead of redirect so the session cookies set on `request` are
  // flushed, while still landing the user on the intended page.
  const url = request.nextUrl.clone();
  url.pathname = next;
  url.search = "";
  return NextResponse.rewrite(url);
}

/** Send the user back to login with a reason they can act on. */
function bounceToLogin(request: NextRequest, reason: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // In demo mode there is no auth backend to complete, so send the user home.
  if (!isSupabaseConfigured()) {
    return bounceToLogin(request, "auth_not_configured");
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next");

  // Build a Supabase client that reads incoming cookies and captures any
  // refreshed session cookies so we can attach them to the outgoing response.
  let response = NextResponse.next({ request });
  const env = readPublicEnv();

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

  let error: string | null = null;

  try {
    if (tokenHash && type) {
      // Flow 1: token-hash confirmation / recovery link.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        // Supabase restricts `type` to a known union; coerce safely because the
        // value originates from an untrusted query param.
        type: (type as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email"),
      });
      error = verifyError?.message ?? null;
    } else if (code) {
      // Flow 2: PKCE authorization-code exchange.
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      error = exchangeError?.message ?? null;
    } else {
      // Neither parameter present — nothing to exchange.
      return bounceToLogin(request, "missing_code");
    }
  } catch {
    error = "Unexpected error while completing sign-in.";
  }

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[auth/callback] verification failed:", error);
    return bounceToLogin(request, "invalid_link");
  }

  // Preserve cookies from `response` across the rewrite. We cannot return the
  // captured `response` directly (it is a "next" response, not a redirect), so
  // we copy the refreshed cookies onto the rewrite we return.
  const rewritten = continueTo(request, rawNext ?? DEFAULT_NEXT);
  for (const cookie of response.cookies.getAll()) {
    rewritten.cookies.set(cookie);
  }
  return rewritten;
}