/**
 * Browser Supabase client.
 *
 * Use this from "use client" components. It is built from the anon key
 * (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) and therefore inherits the row-level
 * security policies on the database. The service-role key is NEVER imported
 * here.
 *
 * If Supabase environment variables are missing, this module returns
 * `null` from `getBrowserSupabase()`. Callers should branch on
 * `isSupabaseConfigured()` first and fall back to the demo store when
 * the client is unavailable.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, readPublicEnv } from "@/lib/env";

export type BrowserSupabase = SupabaseClient;

let cached: BrowserSupabase | null | undefined;

/**
 * Returns a singleton browser client, or `null` if Supabase env vars are not
 * configured. The singleton is created lazily on first call.
 */
export function getBrowserSupabase(): BrowserSupabase | null {
  if (cached !== undefined) return cached;
  if (!isSupabaseConfigured()) {
    cached = null;
    return null;
  }
  const env = readPublicEnv();
  // isSupabaseConfigured() guarantees both are present.
  cached = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );
  return cached;
}

/**
 * Re-creates the singleton. Exposed for hot-reloading cases; the demo
 * fallback does not need it.
 */
export function resetBrowserSupabase(): void {
  cached = undefined;
}
