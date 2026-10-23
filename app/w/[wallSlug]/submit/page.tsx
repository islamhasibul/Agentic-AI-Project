import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DEMO_PROJECTS } from "@/lib/demo-data";
import { getPublicProjectBySlug, hasDatabase } from "@/lib/data/queries";
import { SubmitForm } from "./client-form";

export const dynamic = "force-dynamic";

/**
 * Resolves the project that owns this collection link.
 *
 * Uses `get_public_project_by_slug`, which returns nothing for an unpublished
 * wall. That is what makes an unpublished wall's collection link dead: an
 * anonymous visitor cannot discover or submit to a draft.
 */
async function resolveProject(wallSlug: string) {
  if (hasDatabase()) return await getPublicProjectBySlug(wallSlug);
  return DEMO_PROJECTS.find((p) => p.slug === wallSlug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ wallSlug: string }>;
}): Promise<Metadata> {
  const { wallSlug } = await params;
  const project = hasDatabase()
    ? await getPublicProjectBySlug(wallSlug).catch(() => null)
    : DEMO_PROJECTS.find((p) => p.slug === wallSlug);

  if (!project) return { title: "Submit a testimonial" };
  return {
    title: `Share your thoughts · ${project.name}`,
    description: `Add a testimonial to ${project.name}.`,
  };
}

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ wallSlug: string }>;
}) {
  const { wallSlug } = await params;
  const project = await resolveProject(wallSlug);
  if (!project) notFound();
  return <SubmitForm project={project} />;
}