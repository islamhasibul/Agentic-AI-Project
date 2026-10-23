/**
 * Server actions for project and testimonial writes.
 *
 * These sit between the client forms and `lib/data/mutations.ts`. Their job is
 * to validate untrusted input, revalidate the affected routes so server
 * components re-fetch fresh RLS-filtered data, and return a discriminated result
 * the forms can render without inspecting exception types.
 *
 * SECURITY: no secret ever passes through here. Actions call the anon-key
 * client; the service-role client is not reachable from this module.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProjectSchema,
  fieldErrorsOf,
  moderateTestimonialSchema,
  normalizeCtaPair,
  submitTestimonialSchema,
  updateProjectSchema,
  type ActionResult,
} from "@/lib/data/validation";
import {
  deleteProject as deleteProjectRow,
  deleteTestimonial as deleteTestimonialRow,
  insertProject,
  moderateTestimonial,
  patchProject,
  submitTestimonial,
} from "@/lib/data/mutations";
import { getPublicProjectBySlug, hasDatabase } from "@/lib/data/queries";
import { z } from "zod";

/** Re-renders the owner dashboard + the affected public wall. */
function revalidateProject(slug?: string): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/settings");
  if (slug) revalidatePath(`/w/${slug}`);
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProjectAction(
  input: unknown
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  if (!hasDatabase()) {
    // Demo mode: the in-memory store owns this path. Hand the client back the
    // shape it expects so the demo form keeps working unchanged.
    const id = `p_${Math.random().toString(36).slice(2, 9)}`;
    return { ok: true, demo: true, data: { id, slug: parsed.data.slug } };
  }

  const { cta_label, cta_url } = normalizeCtaPair(parsed.data.ctaLabel, parsed.data.ctaUrl);

  const result = await insertProject({
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description ?? "",
    cta_label,
    cta_url,
  });

  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");

  return { ok: true, data: result.data };
}

export async function updateProjectAction(input: unknown): Promise<ActionResult> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  if (!hasDatabase()) {
    return { ok: true, demo: true, message: "Saved (demo mode — nothing was written)." };
  }

  const { id, ...rest } = parsed.data;

  // If either CTA half is present, normalise the pair so the both-or-neither
  // CHECK constraint is satisfied on the server rather than by luck.
  const patch: Parameters<typeof patchProject>[0] = { id };
  if (rest.name !== undefined) patch.name = rest.name;
  if (rest.slug !== undefined) patch.slug = rest.slug;
  if (rest.description !== undefined) patch.description = rest.description;
  if (rest.isPublished !== undefined) patch.is_published = rest.isPublished;
  if (rest.ctaLabel !== undefined || rest.ctaUrl !== undefined) {
    const pair = normalizeCtaPair(rest.ctaLabel, rest.ctaUrl);
    patch.cta_label = pair.cta_label;
    patch.cta_url = pair.cta_url;
  }

  const result = await patchProject(patch);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateProject(rest.slug);
  return { ok: true };
}

export async function deleteProjectAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid project." };

  if (!hasDatabase()) {
    return { ok: true, demo: true, message: "Deleted (demo mode — nothing was written)." };
  }

  const result = await deleteProjectRow(parsed.data.id);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateProject();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Public submission
// ---------------------------------------------------------------------------

/**
 * Accepts a testimonial from the public form.
 *
 * Resolves the slug to a project id server-side, so a caller cannot submit
 * against an unpublished wall by supplying a raw id. `get_public_project_by_slug`
 * returns nothing for an unpublished wall, which is what makes an unpublished
 * wall's collection link dead.
 */
export async function submitTestimonialAction(input: unknown): Promise<ActionResult> {
  const parsed = submitTestimonialSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  // Honeypot tripped. Report success so a bot learns nothing, but store nothing.
  if (parsed.data.honeypot) {
    return { ok: true, message: "Thank you — your testimonial was received." };
  }

  if (!hasDatabase()) {
    return { ok: true, demo: true, message: "Demo mode — nothing was stored." };
  }

  const project = await getPublicProjectBySlug(parsed.data.projectSlug);
  if (!project) {
    return { ok: false, message: "That collection link is no longer available." };
  }

  const result = await submitTestimonial({
    projectId: project.id,
    authorName: parsed.data.authorName,
    authorEmail: parsed.data.authorEmail,
    authorRole: parsed.data.authorRole || null,
    authorCompany: parsed.data.authorCompany || null,
    content: parsed.data.content,
  });

  if (!result.ok) return { ok: false, message: result.message };

  // The owner's inbox must show the new pending submission, but the public wall
  // must not — approval is required first.
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard");
  revalidatePath(`/w/${project.slug}`);

  return { ok: true, message: "Thank you — your testimonial was received." };
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export async function moderateTestimonialAction(input: unknown): Promise<ActionResult> {
  const parsed = moderateTestimonialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid moderation action." };

  if (!hasDatabase()) {
    return { ok: true, demo: true, message: "Applied (demo mode — nothing was written)." };
  }

  const result = await moderateTestimonial(parsed.data);
  if (!result.ok) return { ok: false, message: result.message };

  // Moderation changes what the public wall shows, so that slug must revalidate.
  const slug = await slugForTestimonial(parsed.data.id);
  revalidateProject(slug ?? undefined);

  return { ok: true };
}

export async function deleteTestimonialAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid testimonial." };

  if (!hasDatabase()) {
    return { ok: true, demo: true, message: "Deleted (demo mode — nothing was written)." };
  }

  const result = await deleteTestimonialRow(parsed.data.id);
  if (!result.ok) return { ok: false, message: result.message };

  const slug = await slugForTestimonial(parsed.data.id);
  revalidateProject(slug ?? undefined);

  return { ok: true };
}

/**
 * Best-effort slug lookup so the public wall revalidates after a moderation
 * change. Runs with the authenticated client, so it only ever finds a
 * testimonial on a wall the caller owns.
 */
async function slugForTestimonial(testimonialId: string): Promise<string | null> {
  const { getServerSupabase } = await import("@/lib/supabase/server");
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("testimonials")
    .select("project_id, projects!inner(slug)")
    .eq("id", testimonialId)
    .maybeSingle();

  if (error || !data) return null;

  const joined = data.projects as unknown as { slug?: string } | { slug?: string }[] | null;
  const slug = Array.isArray(joined) ? joined[0]?.slug : joined?.slug;
  return typeof slug === "string" ? slug : null;
}

/** Convenience re-export so client components can trigger a dashboard refresh. */
export async function refreshDashboardAction(): Promise<void> {
  revalidatePath("/dashboard");
  redirect("/dashboard");
}