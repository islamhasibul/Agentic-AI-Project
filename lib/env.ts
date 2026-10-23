/**
 * Typed environment variable access.
 *
 * This module is safe to import from any context (server, client, edge).
 *
 * Two distinct shapes:
 *   - `readPublicEnv()` : NEXT_PUBLIC_* vars only. Always available, never throws.
 *   - `readServerEnv()` : Server-only vars (service role, raw URLs). Throws if a
 *     required value is missing. Use this in trusted server contexts (RSC,
 *     route handlers, server actions). Never import in client modules.
 *
 * Supabase variables are intentionally NOT required at startup. The demo
 * fallback (lib/demo-data.ts + the in-memory DashboardStoreProvider) keeps
 * rendering when Supabase env vars are absent. Real auth/data paths check
 * `isSupabaseConfigured()` before touching a Supabase client.
 *
 * Note: written against zod 4. We use top-level `z.url()` / `z.email()` and
 * `z.flattenError()` instead of the deprecated `.url()` / `.email()` /
 * `.flatten()` instance methods.
 */
import { flattenError, z } from "zod";

// Public vars (NEXT_PUBLIC_*) are inlined by Next.js at build time into the
// client bundle. Treat them as already public.
const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  NEXT_PUBLIC_APP_URL: z
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined))
    // App URL has a sensible default for local dev.
    .transform((v) => v ?? "http://localhost:3000"),
});

const ServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export type PublicEnv = z.infer<typeof PublicEnvSchema>;
export type ServerEnv = z.infer<typeof ServerEnvSchema>;

/**
 * Parsed public environment.
 *
 * Returns the values exactly as Next.js exposed them to the runtime. Missing
 * keys become `undefined`. Never throws.
 */
export function readPublicEnv(): PublicEnv {
  const parsed = PublicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    // Schema declares all fields optional; failure here means a value is
    // present but malformed. Fall back to all-undefined so the demo still runs.
    if (process.env.NODE_ENV !== "production") {
      const flat = flattenError(parsed.error);
      // eslint-disable-next-line no-console
      console.warn(
        "[env] Invalid NEXT_PUBLIC_* values; running in demo mode.",
        flat.fieldErrors
      );
    }
    return {
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    };
  }
  return parsed.data;
}

/**
 * Parsed server-only environment.
 *
 * Missing keys become `undefined`. Throws only when `requireAll` is true.
 */
export function readServerEnv(opts: { requireAll?: boolean } = {}): ServerEnv {
  const parsed = ServerEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      const flat = flattenError(parsed.error);
      // eslint-disable-next-line no-console
      console.warn(
        "[env] Invalid SUPABASE_SERVICE_ROLE_KEY.",
        flat.fieldErrors
      );
    }
    return { SUPABASE_SERVICE_ROLE_KEY: undefined };
  }
  if (opts.requireAll && !parsed.data.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for this server context."
    );
  }
  return parsed.data;
}

/**
 * True when both browser-visible Supabase variables are present and well-formed.
 * Use this at the boundary of any real Supabase code path to fall back to the
 * in-memory demo store when credentials are missing.
 */
export function isSupabaseConfigured(): boolean {
  const env = readPublicEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
