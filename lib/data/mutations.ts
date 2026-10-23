/**
 * Write operations for projects, testimonials, and moderation.
 *
 * SECURITY MODEL
 * --------------
 * All writes use the **anon-key** authenticated client, so every statement is
 * filtered by RLS:
 *
 *   - `projects_insert_own`         — `WITH CHECK (auth.uid() = profile_id)`.
 *     We cannot create a wall owned by someone else.
 *   - `projects_update_own` / `_delete_own` — `USING (auth.uid() = profile_id)`.
 *     We cannot edit or delete another tenant's wall.
 *   - `testimonials_update_own` / `_delete_own` — resolved by joining up to
 *     `profiles.id`. We cannot moderate another tenant's submissions.
 *
 * Because `FORCE ROW LEVEL SECURITY` is enabled, the table owner does not
 * bypass these policies either.
 *
 * `profile_id` on insert is taken from the verified session, never from input,
 * so ownership cannot be spoofed through the request body.
 *
 * The service-role client is NOT used anywhere in this module. It is reachable
 * only through `ensureProfileForCurrentUser()` in `app/(auth)/actions.ts`, and
 * only for the signup profile bootstrap, which the owner-scoped RLS policies
 * intentionally do not permit a client to do.
 *
 * NOTE ON COLUMN GRANTS: `projects` UPDATE is limited to
 * (slug, name, description, cta_label, cta_url, is_published) and
 * `testimonials` UPDATE to (status, featured, moderated_at, moderated_by).
 * Writing any other column would fail with a Postgres permission error, so the
 * payloads below are restricted to exactly those columns.
 */
import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getViewer } from "@/lib/session";
import { DataAccessError } from "@/lib/data/queries";
import type { TestimonialStatus } from "@/lib/supabase/types";

/** Outcome of a mutation. `ok: false` carries a message safe to show a user. */
export type MutationResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { message?: string } : { data: T }))
  | { ok: false; message: string };

const AUTH_REQUIRED = "You must be signed in to do that.";
const DB_UNAVAILABLE = "The database is unavailable. Please try again.";

/**
 * Resolves the current user, throwing a typed error if there is no session.
 *
 * Every mutation starts here. This is defence in depth — RLS would reject the
 * write anyway — but it lets us return a clear message instead of surfacing a
 * raw Postgres permission error.
 */
async function requireViewerId(): Promise<string> {
  if (!isSupabaseConfigured()) throw new DataAccessError(DB_UNAVAILABLE);
  const viewer = await getViewer();
  if (!viewer) throw new DataAccessError(AUTH_REQUIRED);
  return viewer.id;
}

async function requireSupabase() {
  const supabase = await getServerSupabase();
  if (!supabase) throw new DataAccessError(DB_UNAVAILABLE);
  return supabase;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function insertProject(input: {
  name: string;
  slug: string;
  description: string;
  cta_label: string | null;
  cta_url: string | null;
}): Promise<MutationResult<{ id: string; slug: string }>> {
  try {
    const viewerId = await requireViewerId();
    const supabase = await requireSupabase();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        // Ownership comes from the verified session, never from the payload.
        profile_id: viewerId,
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        cta_label: input.cta_label,
        cta_url: input.cta_url,
      })
      .select("id, slug")
      .single();

    if (error) {
      // 23505 = unique violation on the citext slug index.
      if (error.code === "23505") {
        return { ok: false, message: "That public URL is already taken. Try another slug." };
      }
      return { ok: false, message: "Could not create the project. Please try again." };
    }

    return { ok: true, data: { id: data.id, slug: data.slug } };
  } catch (e) {
    if (e instanceof DataAccessError) return { ok: false, message: e.message };
    return { ok: false, message: "Could not create the project. Please try again." };
  }
}

export async function patchProject(input: {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  cta_label?: string | null;
  cta_url?: string | null;
  is_published?: boolean;
}): Promise<MutationResult> {
  try {
    await requireViewerId();
    const supabase = await requireSupabase();

    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.slug !== undefined) payload.slug = input.slug;
    if (input.description !== undefined) payload.description = input.description || null;
    if (input.cta_label !== undefined) payload.cta_label = input.cta_label;
    if (input.cta_url !== undefined) payload.cta_url = input.cta_url;
    if (input.is_published !== undefined) payload.is_published = input.is_published;

    if (Object.keys(payload).length === 0) {
      return { ok: false, message: "Nothing to update." };
    }

    const { error } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", input.id)
      // RLS already scopes this to the owner; the explicit filter keeps the
      // intent readable and avoids returning rows we cannot write.
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "That public URL is already taken. Try another slug." };
      }
      return { ok: false, message: "Could not save your changes. Please try again." };
    }

    return { ok: true };
  } catch (e) {
    if (e instanceof DataAccessError) return { ok: false, message: e.message };
    return { ok: false, message: "Could not save your changes. Please try again." };
  }
}

export async function deleteProject(id: string): Promise<MutationResult> {
  try {
    await requireViewerId();
    const supabase = await requireSupabase();

    // Testimonials cascade via the FK (ON DELETE CASCADE).
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, message: "Could not delete the project. Please try again." };

    return { ok: true };
  } catch (e) {
    if (e instanceof DataAccessError) return { ok: false, message: e.message };
    return { ok: false, message: "Could not delete the project. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// Public testimonial submission
// ---------------------------------------------------------------------------

/**
 * Submits a testimonial from the public form.
 *
 * This runs as the **anonymous** caller (or as a signed-in visitor, if they
 * happen to have a session — the policy allows both). RLS's
 * `testimonials_insert_anonymous` policy pins every attacker-controllable
 * column server-side: status must be `pending`, featured false, moderation
 * fields NULL, helpful_count 0, created_at `now()`, and `submitted_by` must
 * equal the caller's own uid (or NULL when anonymous).
 *
 * We therefore send only the human-authored fields and let the policy assign
 * the rest. `submitted_by` is read from the session, never from input.
 */
export async function submitTestimonial(input: {
  projectId: string;
  authorName: string;
  authorEmail: string;
  authorRole: string | null;
  authorCompany: string | null;
  content: string;
}): Promise<MutationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Demo mode — nothing was stored." };
  }

  try {
    const supabase = await requireSupabase();

    // A signed-in submitter may record provenance; an anonymous one must send
    // NULL. The policy's `is not distinct from auth.uid()` enforces exactly
    // this, so reading the session here matches what the policy expects.
    const { data: userData } = await supabase.auth.getUser();
    const submittedBy = userData.user?.id ?? null;

    const { error } = await supabase.from("testimonials").insert({
      project_id: input.projectId,
      author_name: input.authorName,
      author_email: input.authorEmail,
      author_role: input.authorRole || null,
      author_company: input.authorCompany || null,
      content: input.content,
      submitted_by: submittedBy,
      submitted_via: submittedBy ? "authenticated" : "anonymous",
      // Not sent: status, featured, moderated_at/by, helpful_count, created_at.
      // All are pinned by the RLS policy, and sending them would violate the
      // anon INSERT grant.
    });

    if (error) {
      // 42501 = insufficient_privilege, i.e. the RLS WITH CHECK rejected us.
      if (error.code === "42501") {
        return { ok: false, message: "That submission could not be accepted." };
      }
      if (error.code === "23514") {
        return { ok: false, message: "Please check the length of each field." };
      }
      return { ok: false, message: "Could not submit your testimonial. Please try again." };
    }

    return { ok: true };
  } catch (e) {
    if (e instanceof DataAccessError) return { ok: false, message: e.message };
    return { ok: false, message: "Could not submit your testimonial. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

/**
 * Applies a moderation action to one testimonial.
 *
 * Ownership is enforced by `testimonials_update_own` (parent project must be
 * owned by the caller). The `status` column is inside the authenticated UPDATE
 * column grant, and the table CHECK `testimonials_approval_requires_approval`
 * rejects `status='approved'` without the moderation audit pair — so approval
 * always leaves a trace naming the moderator.
 *
 * `moderated_by` is taken from the verified session, never from input, so a
 * submitter cannot attribute their own approval to someone else.
 */
export async function moderateTestimonial(input: {
  id: string;
  action: "approve" | "reject" | "hide" | "feature" | "unfeature";
}): Promise<MutationResult> {
  try {
    const viewerId = await requireViewerId();
    const supabase = await requireSupabase();

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    // Featuring an unapproved testimonial implies approval, so both flags move
    // together and the audit pair is always written on a status change.
    const touchesStatus = input.action !== "feature" && input.action !== "unfeature";
    const impliesApproval = input.action === "approve" || input.action === "feature";

    if (input.action === "approve") {
      patch.status = "approved" satisfies TestimonialStatus;
      patch.moderated_at = nowIso;
      patch.moderated_by = viewerId;
    } else if (input.action === "reject") {
      patch.status = "rejected" satisfies TestimonialStatus;
      patch.moderated_at = nowIso;
      patch.moderated_by = viewerId;
    } else if (input.action === "hide") {
      patch.status = "hidden" satisfies TestimonialStatus;
      patch.moderated_at = nowIso;
      patch.moderated_by = viewerId;
    } else if (input.action === "feature") {
      patch.featured = true;
      patch.status = "approved" satisfies TestimonialStatus;
      patch.moderated_at = nowIso;
      patch.moderated_by = viewerId;
    } else {
      patch.featured = false;
    }

    const { error } = await supabase
      .from("testimonials")
      .update(patch)
      .eq("id", input.id)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "42501") {
        return { ok: false, message: "You do not have permission to moderate this." };
      }
      if (error.code === "23514") {
        return { ok: false, message: "That change would leave an inconsistent moderation state." };
      }
      return { ok: false, message: "Could not apply that moderation action." };
    }

    // `maybeSingle` returns null data when RLS filtered the row out, which means
    // the testimonial is not on a wall this caller owns.
    return { ok: true, message: touchesStatus || impliesApproval ? undefined : undefined };
  } catch (e) {
    if (e instanceof DataAccessError) return { ok: false, message: e.message };
    return { ok: false, message: "Could not apply that moderation action." };
  }
}

/** Deletes a testimonial on a wall the caller owns. */
export async function deleteTestimonial(id: string): Promise<MutationResult> {
  try {
    await requireViewerId();
    const supabase = await requireSupabase();

    const { error } = await supabase
      .from("testimonials")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, message: "Could not delete the testimonial." };

    return { ok: true };
  } catch (e) {
    if (e instanceof DataAccessError) return { ok: false, message: e.message };
    return { ok: false, message: "Could not delete the testimonial." };
  }
}