/**
 * Privileged Supabase admin client.
 *
 * This client is built from the **service role key** and bypasses row-level
 * security. It must NEVER be reachable from a browser bundle. The runtime
 * guard below throws if it detects a browser environment, and the
 * `"server-only"` import ensures the bundler errors out if any client
 * component attempts to import this module directly.
 *
 * Use this module only from:
 *   - Trusted scripts (e.g. admin jobs that need to write across tenants).
 *   - Webhook receivers (none in MVP, but reserved for future use).
 *
 * Within the request/response cycle (RSC, route handlers, server actions),
 * prefer `lib/supabase/server.ts` so RLS continues to enforce tenant
 * isolation. The service-role client is reserved for cases where the
 * caller has already proven authorization out-of-band.
 */
import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";

export type AdminSupabase = SupabaseClient;

/**
 * Runtime guard: refuse to construct an admin client in a browser.
 *
 * `typeof window !== "undefined"` is true in any browser environment but
 * never in a Node/Edge runtime. This is belt-and-braces alongside the
 * `server-only` import — even if someone bypasses the bundler rule, the
 * client itself will refuse to start.
 */
function assertServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/supabase/admin.ts attempted to load in a browser context. " +
        "The service-role key must never reach the client. " +
        "Use lib/supabase/client.ts (browser, anon key) or " +
        "lib/supabase/server.ts (server, anon key) instead."
    );
  }
}

/**
 * Returns a per-call Supabase admin client built from the service role key,
 * or `null` if Supabase env vars are not configured. Returns synchronously;
 * no cookies involved.
 */
export function getAdminSupabase(): AdminSupabase | null {
  assertServerRuntime();
  if (!isSupabaseConfigured()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      // The admin client runs in trusted server contexts; explicit user
      // impersonation is rare and is opt-in only.
      detectSessionInUrl: false,
    },
  });
}
