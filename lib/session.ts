/**
 * Server-side session resolution.
 *
 * Single source of truth for "who is the current user?" on the server.
 *
 * `getUser()` is used rather than `getSession()` on purpose: `getSession()`
 * only decodes the JWT and does not verify it with the Auth server, so it can
 * be forged with a stale or tampered cookie. `getUser()` re-validates the
 * token against Supabase and returns null for anything invalid.
 *
 * Returns `null` when Supabase is not configured, which callers treat as
 * "demo mode" rather than "unauthenticated".
 */
import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  email: string | null;
  name: string | null;
};

/**
 * Deduplicated per render pass via React `cache`, so a layout and several
 * nested server components can call this without re-verifying the token.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return toViewer(user);
});

function toViewer(user: User): Viewer {
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.user_name === "string" && meta.user_name.trim()) ||
    null;

  return {
    id: user.id,
    email: user.email ?? null,
    name: name ?? (user.email ? user.email.split("@")[0] : "Member"),
  };
}