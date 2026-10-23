/**
 * Server Supabase client.
 *
 * Use this from React Server Components, Route Handlers, and Server
 * Actions. The cookies adapter reads and writes the Supabase auth cookies
 * via `next/headers`, allowing the session to be refreshed as part of the
 * normal request/response cycle (cookie writes are flushed in the Server
 * Component or Route Handler response).
 *
 * This client is built from the anon key and therefore inherits all RLS
 * policies. It must be re-created per request — see the `@supabase/ssr`
 * guidance: never share a server client across requests.
 *
 * If Supabase environment variables are missing, `getServerSupabase()`
 * returns `null`. Callers should fall back to the demo store.
 */
import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, readPublicEnv } from "@/lib/env";

export type ServerSupabase = SupabaseClient;

/**
 * Returns a per-request Supabase client, or `null` if env vars are missing.
 *
 * IMPORTANT: only call this from contexts where `next/headers` cookies are
 * available (RSC, Route Handlers, Server Actions). Do not call from
 * middleware — see `lib/supabase/middleware.ts` for that flow.
 */
export async function getServerSupabase(): Promise<ServerSupabase | null> {
  if (!isSupabaseConfigured()) return null;

  const env = readPublicEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `set` is only allowed in Server Actions and Route Handlers.
            // Middleware is responsible for refreshing the session. We
            // intentionally swallow this so the call site can still read
            // the current session even when the cookie store is read-only.
          }
        },
      },
    }
  );
}
