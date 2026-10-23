import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicWall } from "./client-wall";
import { DEMO_PROJECTS, DEMO_TESTIMONIALS_BY_PROJECT } from "@/lib/demo-data";
import { getPublicProjectBySlug, getPublicTestimonials, hasDatabase } from "@/lib/data/queries";
import { sortForPublicWall } from "@/lib/data/mappers";

/**
 * Public wall at `/w/{slug}`.
 *
 * Renders on demand (`dynamic = "force-dynamic"`) whenever Supabase is
 * configured, so a newly published wall or newly approved testimonial appears
 * immediately rather than being frozen into a build-time snapshot. In demo mode
 * it falls back to static generation over the fixtures so the sample walls stay
 * inspectable with no backend.
 */
export const dynamic = "force-dynamic";

/**
 * Only meaningful in demo mode. When Supabase is configured the wall must be
 * resolved per-request (an unpublished wall has to 404), so there is no safe
 * static param list.
 */
export function generateStaticParams() {
  if (hasDatabase()) return [];
  return DEMO_PROJECTS.map((p) => ({ wallSlug: p.slug }));
}

/**
 * Resolves the wall from the database when available, else from demo data.
 *
 * Returns `null` when the slug does not resolve — including the case where the
 * project exists but is not published, because
 * `get_public_project_by_slug` filters on `is_published`. An anonymous caller
 * cannot distinguish "no such wall" from "unpublished wall", which is intended.
 */
async function resolveWall(wallSlug: string) {
  if (hasDatabase()) {
    const project = await getPublicProjectBySlug(wallSlug);
    if (!project) return null;
    const testimonials = (await getPublicTestimonials(project.id)) ?? [];
    // The RPC already orders featured-first then newest; re-sorting here keeps
    // the demo and live paths producing identical output.
    return { project, testimonials: sortForPublicWall(testimonials) };
  }

  const project = DEMO_PROJECTS.find((p) => p.slug === wallSlug);
  if (!project) return null;
  const all = DEMO_TESTIMONIALS_BY_PROJECT[project.id] ?? [];
  const approved = all.filter((t) => t.status === "approved");
  return { project, testimonials: sortForPublicWall(approved) };
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

  if (!project) return { title: "Wall not found" };
  return {
    title: project.name,
    description: project.description,
    openGraph: {
      title: project.name,
      description: project.description,
      type: "website",
    },
  };
}

export default async function PublicWallPage({
  params,
}: {
  params: Promise<{ wallSlug: string }>;
}) {
  const { wallSlug } = await params;
  const wall = await resolveWall(wallSlug);
  if (!wall) notFound();

  return <PublicWall project={wall.project} testimonials={wall.testimonials} />;
}