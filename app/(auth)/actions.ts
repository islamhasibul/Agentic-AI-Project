/**
 * Authentication server actions.
 *
 * All auth mutations run here rather than in client components so that:
 *   - Supabase auth calls use the server cookie adapter (`getServerSupabase`),
 *     which is the only client allowed to *write* session cookies from a
 *     Server Action.
 *   - Input is validated with Zod before it reaches Supabase.
 *   - Redirect targets are validated with `safeRedirectPath` before they reach
 *     `redirect()` — an attacker-controlled `?next=` can never bounce a
 *     freshly-authenticated user off-origin.
 *
 * Demo fallback: when Supabase env vars are missing, every action returns a
 * discriminated `demo: true` result instead of throwing, so the existing
 * demo UI keeps working with zero configuration.
 */
"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { isSupabaseConfigured, readPublicEnv } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/redirect";

const DEFAULT_NEXT = "/dashboard";

const CredentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(200),
  /** Untrusted; validated before it is ever used as a redirect. */
  next: z.string().optional(),
});

const SignUpSchema = CredentialsSchema.extend({
  name: z.string().trim().min(2).max(80),
});

const ForgotPasswordSchema = z.object({
  email: z.email().max(254),
});

export type AuthResult =
  | { ok: true; demo: boolean; message: string }
  | { ok: false; demo: boolean; message: string; fieldErrors?: Record<string, string[]> };

/**
 * The app's own origin, derived from the incoming request headers.
 *
 * We deliberately do NOT accept an origin from the client. Using the request's
 * own Host header means the `emailRedirectTo` we hand to Supabase always points
 * back at the deployment the user is actually talking to. Supabase validates
 * this against the project's allowed redirect URLs.
 */
async function requestOrigin(): Promise<string> {
  const env = readPublicEnv();
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/** Sign-up with email + password. Requires email confirmation before first login. */
export async function signUpAction(input: unknown): Promise<AuthResult> {
  const parsed = SignUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      demo: false,
      message: "Please check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  const { email, password, name, next } = parsed.data;

  if (!isSupabaseConfigured()) {
    // Demo mode: mirror the previous UX without touching a backend.
    return {
      ok: true,
      demo: true,
      message: "Demo mode — check your email to confirm your account.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { ok: false, demo: false, message: "Authentication is unavailable. Please try again." };
  }

  const origin = await requestOrigin();
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
    safeRedirectPath(next, DEFAULT_NEXT)
  )}`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      // Store the display name on the user. Milestone 2 adds a database
      // trigger that mirrors this into `public.profiles`.
      data: { name },
    },
  });

  if (error) {
    // Do not leak whether an account exists for this email.
    return { ok: false, demo: false, message: "We could not create your account. Please try again." };
  }

  return {
    ok: true,
    demo: false,
    message: "Check your inbox to confirm your email, then log in.",
  };
}

/** Email + password sign-in. Redirects to a validated `next` on success. */
export async function signInAction(input: unknown): Promise<AuthResult> {
  const parsed = CredentialsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      demo: false,
      message: "Enter a valid email address and a password of at least 8 characters.",
    };
  }
  const { email, password, next } = parsed.data;

  if (!isSupabaseConfigured()) {
    // Demo mode: the dashboard is intentionally unauthenticated, so send the
    // reviewer straight through. No session is created and nothing is stored.
    redirect(safeRedirectPath(next, DEFAULT_NEXT));
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { ok: false, demo: false, message: "Authentication is unavailable. Please try again." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Generic message on purpose: never reveal whether the email is registered.
    return { ok: false, demo: false, message: "Incorrect email or password." };
  }

  // Success. Bounce to the validated target; cookies were set by the client.
  redirect(safeRedirectPath(next, DEFAULT_NEXT));
}

/** Request a password-reset email. Always reports success, even for unknown emails. */
export async function requestPasswordResetAction(input: unknown): Promise<AuthResult> {
  const parsed = ForgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, demo: false, message: "Enter a valid email address." };
  }
  const { email } = parsed.data;

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      demo: true,
      message: "Demo mode — password reset emails are not actually sent.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { ok: false, demo: false, message: "Authentication is unavailable. Please try again." };
  }

  const origin = await requestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  if (error) {
    return { ok: false, demo: false, message: "We could not send the reset email. Please try again." };
  }

  // Deliberately identical to the "unknown email" message to prevent account
  // enumeration via this endpoint.
  return {
    ok: true,
    demo: false,
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

/** Set a new password from an active recovery session. */
export async function updatePasswordAction(input: unknown): Promise<AuthResult> {
  const parsed = z.object({ password: z.string().min(8).max(200) }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, demo: false, message: "Use at least 8 characters." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, demo: true, message: "Demo mode — nothing was changed." };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { ok: false, demo: false, message: "Authentication is unavailable. Please try again." };
  }

  // Guard: only a user holding a valid recovery session may set a password.
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return { ok: false, demo: false, message: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, demo: false, message: "We could not update your password. Please try again." };
  }

  redirect("/dashboard");
}

/**
 * Sign out.
 *
 * Uses the anon-key server client so RLS/`auth.uid()` still applies, and so no
 * service-role key is ever involved in a user-facing request path. After
 * Supabase clears the cookies we redirect to `/login`; `redirect()` throws a
 * control-flow signal that ends the action, so it must be the last statement.
 */
export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await getServerSupabase();
    if (supabase) {
      await supabase.auth.signOut().catch(() => {
        // Clearing local cookies below is what actually matters for the user.
      });
    }
  }
  redirect("/login");
}

/**
 * Ensure a `public.profiles` row exists for the current user.
 *
 * Called from the dashboard layout on first authenticated request. Uses the
 * service-role client (server-only, never shipped to the browser) because
 * creating another user's row is not permitted under the owner-scoped RLS
 * policies. This is the standard Supabase bootstrap pattern and runs only
 * after `auth.getUser()` has already proven the caller's identity.
 */
export async function ensureProfileForCurrentUser(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await getServerSupabase();
  if (!supabase) return;

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return;

  const admin = getAdminSupabase();
  if (!admin) return;

  const displayName =
    typeof data.user.user_metadata?.name === "string" && data.user.user_metadata.name.trim()
      ? data.user.user_metadata.name.trim()
      : (data.user.email ?? "Member").split("@")[0];

  await admin
    .from("profiles")
    .upsert(
      {
        id: data.user.id,
        email: data.user.email ?? null,
        display_name: displayName,
      },
      { onConflict: "id", ignoreDuplicates: true }
    )
    .then(({ error }) => {
      if (error) {
        // Non-fatal: the user can still browse; the dashboard falls back.
        // eslint-disable-next-line no-console
        console.error("[auth] ensureProfile failed:", error.message);
      }
    });
}