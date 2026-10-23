/**
 * Database row types, hand-mapped from supabase/migrations.
 *
 * These mirror the SQL exactly. They are intentionally hand-written rather than
 * generated (the PRD defers codegen to a follow-up), so they must be kept in
 * sync with migrations 0001-0005 by hand.
 *
 * Naming: the SQL uses snake_case; TypeScript uses camelCase. The mapping is
 * centralised in `lib/data/mappers.ts` so a schema change only touches one file.
 */

/** Mirrors `testimonials.status` CHECK constraint. */
export type TestimonialStatus = "pending" | "approved" | "rejected" | "hidden";

/** Row in `public.profiles`. */
export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** Row in `public.projects`. */
export type ProjectRow = {
  id: string;
  profile_id: string;
  slug: string;
  name: string;
  description: string | null;
  cta_label: string | null;
  cta_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

/** Row in `public.testimonials`. */
export type TestimonialRow = {
  id: string;
  project_id: string;
  author_name: string;
  author_email: string;
  author_role: string | null;
  author_company: string | null;
  content: string;
  submitted_by: string | null;
  submitted_via: string;
  status: TestimonialStatus;
  featured: boolean;
  helpful_count: number;
  moderated_at: string | null;
  moderated_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Return shape of `public.get_public_project_by_slug(text)` (migration 0005).
 *
 * NOTE this is deliberately narrower than `ProjectRow`: the RPC does not
 * return `profile_id`, `is_published`, or `updated_at`. A published wall is
 * always `is_published = true` by construction, so the mapper hardcodes it.
 */
export type PublicProjectRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cta_label: string | null;
  cta_url: string | null;
  created_at: string;
};

/**
 * Return shape of `public.get_public_testimonials(uuid)` (migration 0005).
 *
 * The function pins the safe column list server-side, so this is what the
 * public wall reads. Note the absence of `author_email`, `submitted_by` and
 * `moderated_by` — the anon role has no SELECT grant on those columns, which is
 * why `select *` is never used on this path.
 */
export type PublicTestimonialRow = {
  id: string;
  project_id: string;
  author_name: string;
  author_role: string | null;
  author_company: string | null;
  content: string;
  status: TestimonialStatus;
  featured: boolean;
  helpful_count: number;
  created_at: string;
};

/**
 * Columns selected for owner-scoped testimonial reads.
 *
 * `author_email` is included deliberately: the owner needs it to follow up on
 * a submission, and `authenticated` has the SELECT grant. It is never exposed
 * on the public wall.
 */
export const OWNER_TESTIMONIAL_COLUMNS =
  "id, project_id, author_name, author_email, author_role, author_company, content, submitted_by, submitted_via, status, featured, helpful_count, moderated_at, moderated_by, created_at, updated_at";

/** Columns selected for owner-scoped project reads. */
export const OWNER_PROJECT_COLUMNS =
  "id, profile_id, slug, name, description, cta_label, cta_url, is_published, created_at, updated_at";