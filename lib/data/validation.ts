/**
 * Zod validation schemas shared by server actions and (as a first-pass UX
 * affordance) client forms.
 *
 * Server-side validation is authoritative: every server action re-validates
 * its input before it touches Supabase. Client-side checks exist only to give
 * fast feedback and must never be treated as a security boundary.
 *
 * The bounds here mirror the SQL CHECK constraints so a value that passes
 * Zod will not be rejected by Postgres for a length/reason violation. Postgres
 * remains the final authority — these are for clearer errors, not for safety.
 *
 * Written against zod 4 (top-level `z.url()`, `z.email()`).
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/**
 * Slug rules, mirroring the `projects_slug_check` CHECK constraint:
 * lowercase alphanumeric and hyphens, 3-64 characters.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .trim()
  .min(3, "Use at least 3 characters.")
  .max(64, "Keep the slug under 64 characters.")
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens only.");

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Give your wall a name.")
  .max(120, "Keep the name under 120 characters.");

export const projectDescriptionSchema = z
  .string()
  .trim()
  .max(2000, "Keep the description under 2000 characters.");

/**
 * CTA URL, mirroring the `cta_url` CHECK (http/https only).
 *
 * The http(s) restriction blocks `javascript:` and `data:` URLs, which would
 * otherwise become stored XSS once rendered as a link on the public wall.
 */
export const ctaUrlSchema = z
  .url("Enter a full URL including https://")
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), "URL must start with http:// or https://");

export const createProjectSchema = z.object({
  name: projectNameSchema,
  slug: slugSchema,
  description: projectDescriptionSchema.optional().default(""),
  ctaLabel: z.string().trim().max(120).optional(),
  ctaUrl: ctaUrlSchema.optional(),
});

export const updateProjectSchema = z
  .object({
    id: z.uuid(),
    name: projectNameSchema.optional(),
    slug: slugSchema.optional(),
    description: projectDescriptionSchema.optional(),
    ctaLabel: z.string().trim().max(120).nullish(),
    ctaUrl: ctaUrlSchema.nullish(),
    isPublished: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 1, "Nothing to update.");

/**
 * Normalises the CTA pair.
 *
 * The DB CHECK requires `cta_label` and `cta_url` to be both-or-neither, so a
 * label without a URL (or vice versa) is coerced to null/null rather than
 * being sent to Postgres to reject.
 */
export function normalizeCtaPair(
  label: string | null | undefined,
  url: string | null | undefined
): { cta_label: string | null; cta_url: string | null } {
  const cleanLabel = typeof label === "string" ? label.trim() : "";
  const cleanUrl = typeof url === "string" ? url.trim() : "";
  if (!cleanLabel || !cleanUrl) return { cta_label: null, cta_url: null };
  return { cta_label: cleanLabel, cta_url: cleanUrl };
}

// ---------------------------------------------------------------------------
// Testimonials (public submission)
// ---------------------------------------------------------------------------

/** Mirrors `testimonials_author_name_check`: 1-120 characters. */
export const authorNameSchema = z.string().trim().min(1, "Please share your name.").max(120);

/** Mirrors `testimonials_content_check`: 20-2000 characters. */
export const testimonialContentSchema = z
  .string()
  .trim()
  .min(20, "At least 20 characters — tell us a bit more.")
  .max(2000, "Keep it under 2000 characters.");

export const submitTestimonialSchema = z.object({
  /** Public URL segment; resolved to a project id server-side. */
  projectSlug: slugSchema,
  authorName: authorNameSchema,
  authorEmail: z.email("Enter a valid email address.").max(254),
  authorRole: z.string().trim().max(120).optional().default(""),
  authorCompany: z.string().trim().max(120).optional().default(""),
  content: testimonialContentSchema,
  /** Must be empty. Non-empty means a bot filled the hidden field. */
  honeypot: z.string().max(0, "Rejected.").optional().default(""),
});

export type SubmitTestimonialInput = z.infer<typeof submitTestimonialSchema>;

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export const TESTIMONIAL_STATUSES = ["pending", "approved", "rejected", "hidden"] as const;

export const moderateTestimonialSchema = z.object({
  id: z.uuid(),
  action: z.enum(["approve", "reject", "hide", "feature", "unfeature"]),
});

// ---------------------------------------------------------------------------
// Shared result type for every server action
// ---------------------------------------------------------------------------

export type ActionResult<T = undefined> =
  | ({ ok: true; demo?: boolean } & (T extends undefined ? { message?: string } : { data: T }))
  | {
      ok: false;
      demo?: boolean;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

/** Flattens a ZodError into the `fieldErrors` shape used by the forms. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}