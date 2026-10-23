/**
 * Server-side data access for projects, testimonials, and public walls.
 *
 * SECURITY MODEL
 * --------------
 * Every function here uses the **anon-key** server client (`lib/supabase/server.ts`),
 * never the service-role client. Tenant isolation is enforced by Postgres RLS,
 * which `auth.uid()` populates from the verified session cookie. That means the
 * "does this user own that project?" question is answered by the database, not
 * by application code — so even a bug in a route or param handling cannot leak
 * another tenant's rows.
 *
 * Where an ownership check is *also* done in application code (e.g. to decide
 * whether to render a 404 rather than an empty list) it is an ergonomic
 * affordance, not the security boundary. RLS is.
 *
 * Every function returns `null` (or an empty result) rather than throwing when
 * Supabase is not configured, so callers can fall back to the demo store.
 * Genuine database errors are thrown as `DataAccessError` so the UI can show an
 * error state instead of silently rendering "no data".
 */
import "server-only";

import { cache } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  OWNER_PROJECT_COLUMNS,
  OWNER_TESTIMONIAL_COLUMNS,
  type ProjectRow,
  type PublicProjectRow,
  type PublicTestimonialRow,
  type TestimonialRow,
} from "@/lib/supabase/types";
import {
  countByStatus,
  sortForPublicWall,
  toProject,
  toPublicProject,
  toPublicTestimonial,
  toTestimonial,
} from "@/lib/data/mappers";
import type { Project, Testimonial } from "@/lib/demo-data";

/** Thrown when a query fails for a reason other than "not configured". */
export class DataAccessError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "DataAccessError";
  }
}

/** True when the app should use the live database rather than demo data. */
export function hasDatabase(): boolean {
  return isSupabaseConfigured();
}

// ---------------------------------------------------------------------------
// Owner-scoped reads (authenticated, RLS-filtered)
// ---------------------------------------------------------------------------

/**
 * All projects owned by the current user, newest first.
 *
 * RLS returns only rows where `auth.uid() = profile_id`, so drafts are
 * included here even though they are invisible on the public wall.
 */
export const listProjects = cache(async (): Promise<Project[] | null> => {
  if (!hasDatabase()) return null;

  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select(OWNER_PROJECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw new DataAccessError("Could not load projects.", error);

  const rows = (data ?? []) as ProjectRow[];

  // Counts are derived from the owner's own testimonial rows. Doing this in one
  // extra query rather than N per-project queries avoids a request waterfall.
  const ids = rows.map((r) => r.id);
  const countsByProject = new Map<string, Project["counts"]>();
  if (ids.length > 0) {
    const { data: tData, error: tError } = await supabase
      .from("testimonials")
      .select("project_id, status")
      .in("project_id", ids);

    if (tError) throw new DataAccessError("Could not load testimonial counts.", tError);

    const grouped = new Map<string, Pick<TestimonialRow, "status">[]>();
    for (const row of (tData ?? []) as Pick<TestimonialRow, "project_id" | "status">[]) {
      const bucket = grouped.get(row.project_id);
      if (bucket) bucket.push({ status: row.status });
      else grouped.set(row.project_id, [{ status: row.status }]);
    }
    for (const [projectId, list] of grouped) countsByProject.set(projectId, countByStatus(list));
  }

  return rows.map((row) => toProject(row, countsByProject.get(row.id)));
});

/**
 * A single project by id, scoped to the current user.
 *
 * Returns `null` for both "does not exist" and "not yours" — deliberately
 * indistinguishable, so this endpoint cannot be used to probe for the
 * existence of another tenant's project ids.
 */
export const getProjectById = cache(async (id: string): Promise<Project | null> => {
  if (!hasDatabase()) return null;

  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select(OWNER_PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new DataAccessError("Could not load the project.", error);
  if (!data) return null;

  const row = data as ProjectRow;
  const { data: tData, error: tError } = await supabase
    .from("testimonials")
    .select("status")
    .eq("project_id", row.id);

  if (tError) throw new DataAccessError("Could not load testimonial counts.", tError);

  return toProject(
    row,
    countByStatus((tData ?? []) as Pick<TestimonialRow, "status">[])
  );
});

/**
 * All testimonials across every project the caller owns.
 *
 * Used by the dashboard overview and the cross-project inbox.
 */
export const listAllTestimonials = cache(async (): Promise<Testimonial[] | null> => {
  if (!hasDatabase()) return null;

  const supabase = await getServerSupabase();
  if (!supabase) return null;

  // The RLS predicate resolves ownership by joining up to profiles.id, so no
  // explicit owner filter is needed (and adding one would be redundant).
  const { data, error } = await supabase
    .from("testimonials")
    .select(OWNER_TESTIMONIAL_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw new DataAccessError("Could not load testimonials.", error);

  return ((data ?? []) as TestimonialRow[]).map(toTestimonial);
});

/** Testimonials for one project the caller owns. */
export const listTestimonialsForProject = cache(
  async (projectId: string): Promise<Testimonial[] | null> => {
    if (!hasDatabase()) return null;

    const supabase = await getServerSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("testimonials")
      .select(OWNER_TESTIMONIAL_COLUMNS)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw new DataAccessError("Could not load testimonials.", error);

    return ((data ?? []) as TestimonialRow[]).map(toTestimonial);
  }
);

// ---------------------------------------------------------------------------
// Public reads (anonymous, RLS-filtered)
// ---------------------------------------------------------------------------

/**
 * A published project by slug, for the public wall.
 *
 * Uses `get_public_project_by_slug(text)` (migration 0005) rather than a
 * direct table read, so the safe column list is pinned server-side and an
 * unpublished wall returns nothing to anonymous callers.
 */
export const getPublicProjectBySlug = cache(
  async (slug: string): Promise<Project | null> => {
    if (!hasDatabase()) return null;

    const supabase = await getServerSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase.rpc("get_public_project_by_slug", {
      project_slug: slug,
    });

    if (error) throw new DataAccessError("Could not load the wall.", error);
    if (!data) return null;

    const row = Array.isArray(data)
      ? (data[0] as PublicProjectRow | undefined)
      : (data as PublicProjectRow);
    if (!row) return null;

    // Counts stay zeroed: an anonymous reader must not learn pending/rejected
    // totals. `toPublicProject` handles that.
    return toPublicProject(row);
  }
);

/**
 * Approved testimonials on a published project, for the public wall.
 *
 * Uses `get_public_testimonials(uuid)`, which pins the safe column list and
 * filters to `status = 'approved'` AND parent `is_published`. Note this is NOT
 * a `select *`: `author_email` is column-revoked from `anon`, so a `select *`
 * on this path would fail outright.
 */
export const getPublicTestimonials = cache(
  async (projectId: string): Promise<Testimonial[] | null> => {
    if (!hasDatabase()) return null;

    const supabase = await getServerSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase.rpc("get_public_testimonials", {
      project_uuid: projectId,
    });

    if (error) throw new DataAccessError("Could not load testimonials.", error);
    if (!data) return null;

    const rows = (Array.isArray(data) ? data : [data]) as PublicTestimonialRow[];
    return sortForPublicWall(rows.map(toPublicTestimonial));
  }
);

/**
 * Resolve a public slug to both the project and its approved testimonials.
 *
 * One call site for the public wall and the submission page, which need the
 * same pair and must agree on whether the wall exists.
 */
export async function getPublicWall(
  slug: string
): Promise<{ project: Project; testimonials: Testimonial[] } | null> {
  const project = await getPublicProjectBySlug(slug);
  if (!project) return null;
  const testimonials = (await getPublicTestimonials(project.id)) ?? [];
  return { project, testimonials };
}