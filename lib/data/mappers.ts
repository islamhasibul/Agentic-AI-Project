/**
 * Row <-> view-model mapping.
 *
 * The SQL schema is snake_case; the UI (and `lib/demo-data.ts`, which this must
 * stay compatible with) is camelCase. Every conversion between the two happens
 * here so a column rename is a one-file change.
 */
import type {
  ProjectRow,
  PublicProjectRow,
  PublicTestimonialRow,
  TestimonialRow,
  TestimonialStatus,
} from "@/lib/supabase/types";
import type { Project, Testimonial } from "@/lib/demo-data";

/** Zeroed count bundle, used when a project has no testimonial rows. */
export function emptyCounts(): Project["counts"] {
  return { submitted: 0, approved: 0, pending: 0, rejected: 0 };
}

/**
 * Aggregates testimonial rows into the per-status counts the dashboard shows.
 *
 * Computed in application code rather than SQL so the shape matches the demo
 * store exactly and both modes render identically.
 */
export function countByStatus(rows: Pick<TestimonialRow, "status">[]): Project["counts"] {
  const counts = emptyCounts();
  for (const row of rows) {
    counts.submitted += 1;
    if (row.status === "approved") counts.approved += 1;
    else if (row.status === "pending") counts.pending += 1;
    else if (row.status === "rejected") counts.rejected += 1;
  }
  return counts;
}

export function toProject(row: ProjectRow, counts?: Project["counts"]): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    ctaLabel: row.cta_label ?? undefined,
    ctaUrl: row.cta_url ?? undefined,
    isPublished: row.is_published,
    createdAt: row.created_at,
    counts: counts ?? emptyCounts(),
  };
}

/**
 * Maps a row returned by `get_public_project_by_slug(text)`.
 *
 * The RPC omits `profile_id`/`is_published`, so `is_published` is hardcoded to
 * `true` — the function only returns rows that are already published, so this
 * is not an assumption, it is the function's own filter restated.
 */
export function toPublicProject(row: PublicProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    ctaLabel: row.cta_label ?? undefined,
    ctaUrl: row.cta_url ?? undefined,
    // The RPC only ever returns published rows, so this is the function's own
    // filter restated rather than an assumption.
    isPublished: true,
    createdAt: row.created_at,
    // Zeroed: an anonymous reader must not learn pending/rejected totals.
    counts: emptyCounts(),
  };
}

export function toTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    authorName: row.author_name,
    authorEmail: row.author_email,
    authorRole: row.author_role ?? undefined,
    authorCompany: row.author_company ?? undefined,
    content: row.content,
    status: row.status as TestimonialStatus,
    featured: row.featured,
    helpfulCount: row.helpful_count,
    createdAt: row.created_at,
  };
}

/**
 * Maps a row returned by `get_public_testimonials()`.
 *
 * Deliberately does not accept `author_email` — the RPC does not return it and
 * the anon role cannot select it. Typing this without the field is a
 * compile-time guard against accidentally surfacing it on a public wall.
 */
export function toPublicTestimonial(row: PublicTestimonialRow): Testimonial {
  return {
    id: row.id,
    authorName: row.author_name,
    // Placeholder only; the public shape has no email by design. Never render
    // this value. It exists purely to satisfy the shared `Testimonial` type.
    authorEmail: "",
    authorRole: row.author_role ?? undefined,
    authorCompany: row.author_company ?? undefined,
    content: row.content,
    status: row.status,
    featured: row.featured,
    helpfulCount: row.helpful_count,
    createdAt: row.created_at,
  };
}

/**
 * Public-wall ordering, matching the previous demo behaviour: featured first,
 * then newest.
 */
export function sortForPublicWall(list: Testimonial[]): Testimonial[] {
  return [...list].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || +new Date(b.createdAt) - +new Date(a.createdAt)
  );
}