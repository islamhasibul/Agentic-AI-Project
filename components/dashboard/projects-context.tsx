"use client";

import * as React from "react";
import {
  DEMO_PROJECTS,
  DEMO_TESTIMONIALS_BY_PROJECT,
  type Project,
  type Testimonial,
} from "@/lib/demo-data";
import {
  createProjectAction,
  deleteProjectAction,
  moderateTestimonialAction,
  updateProjectAction,
} from "@/app/actions/data";

/**
 * Dashboard data provider.
 *
 * Two modes, chosen once by the server layout:
 *
 *   - **Live** (`demoMode = false`): seeded from RLS-filtered server reads, and
 *     every mutation round-trips through a server action and `revalidatePath`.
 *     Server Components re-render with fresh data, so this context acts as a
 *     display cache that keeps client components in sync between navigations.
 *
 *   - **Demo** (`demoMode = true`): the original in-memory store, so the UI is
 *     fully reviewable with no Supabase project configured.
 *
 * Ownership is never enforced here. Every write goes through a server action
 * using the authenticated anon-key client, so RLS decides what actually
 * changes; this layer only reflects the result.
 */

type ModerationAction = "approve" | "reject" | "hide" | "feature" | "unfeature";

interface DashboardState {
  projects: Project[];
  testimonialsByProject: Record<string, Testimonial[]>;
  demoMode: boolean;
  /** Optimistically apply a moderation action; reverts if the action fails. */
  moderate: (projectId: string, testimonialId: string, action: ModerationAction) => Promise<boolean>;
  createProject: (input: {
    name: string;
    slug: string;
    description: string;
    ctaLabel?: string;
    ctaUrl?: string;
  }) => Promise<{ ok: true; id: string; slug: string } | { ok: false; message: string; fieldErrors?: Record<string, string[]> }>;
  updateProject: (input: {
    id: string;
    name?: string;
    slug?: string;
    description?: string;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    isPublished?: boolean;
  }) => Promise<{ ok: true } | { ok: false; message: string }>;
  deleteProject: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
}

const Ctx = React.createContext<DashboardState | null>(null);

export function DashboardStoreProvider({
  children,
  demoMode = false,
  initialProjects,
  initialTestimonialsByProject,
}: {
  children: React.ReactNode;
  demoMode?: boolean;
  initialProjects?: Project[];
  initialTestimonialsByProject?: Record<string, Testimonial[]>;
}) {
  const [projects, setProjects] = React.useState<Project[]>(
    () => initialProjects ?? (demoMode ? DEMO_PROJECTS : [])
  );
  const [testimonialsByProject, setTestimonialsByProject] = React.useState<
    Record<string, Testimonial[]>
  >(() => initialTestimonialsByProject ?? (demoMode ? DEMO_TESTIMONIALS_BY_PROJECT : {}));

  const moderate = React.useCallback(
    async (projectId: string, testimonialId: string, action: ModerationAction) => {
      // Snapshot for rollback.
      const previous = testimonialsByProject;
      const previousProjects = projects;

      if (demoMode) {
        // Local-only behaviour, mirroring the original demo semantics.
        setTestimonialsByProject((prev) => {
          const list = prev[projectId] ?? [];
          return {
            ...prev,
            [projectId]: list.map((t) => {
              if (t.id !== testimonialId) return t;
              if (action === "approve") return { ...t, status: "approved" };
              if (action === "reject") return { ...t, status: "rejected" };
              if (action === "hide") return { ...t, status: "hidden" };
              if (action === "feature") return { ...t, featured: true, status: "approved" };
              if (action === "unfeature") return { ...t, featured: false };
              return t;
            }),
          };
        });
        return true;
      }

      // Optimistic update so the button feels instant.
      setTestimonialsByProject((prev) => {
        const list = prev[projectId] ?? [];
        return {
          ...prev,
          [projectId]: list.map((t) => {
            if (t.id !== testimonialId) return t;
            if (action === "approve") return { ...t, status: "approved" };
            if (action === "reject") return { ...t, status: "rejected" };
            if (action === "hide") return { ...t, status: "hidden" };
            if (action === "feature") return { ...t, featured: true, status: "approved" };
            if (action === "unfeature") return { ...t, featured: false };
            return t;
          }),
        };
      });

      const result = await moderateTestimonialAction({ id: testimonialId, action });

      if (!result.ok) {
        // Roll back to the last known-good state.
        setTestimonialsByProject(previous);
        setProjects(previousProjects);
        return false;
      }

      // Recompute this project's counts from the updated list so the stat pills
      // stay consistent without a round trip.
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const list = testimonialsByProject[projectId] ?? [];
          const counts = { submitted: list.length, approved: 0, pending: 0, rejected: 0 };
          for (const t of list) {
            if (t.status === "approved") counts.approved += 1;
            else if (t.status === "pending") counts.pending += 1;
            else if (t.status === "rejected") counts.rejected += 1;
          }
          return { ...p, counts };
        })
      );

      return true;
    },
    [demoMode, projects, testimonialsByProject]
  );

  const createProject = React.useCallback(
    async (input: {
      name: string;
      slug: string;
      description: string;
      ctaLabel?: string;
      ctaUrl?: string;
    }) => {
      const result = await createProjectAction({
        name: input.name,
        slug: input.slug,
        description: input.description,
        ctaLabel: input.ctaLabel,
        ctaUrl: input.ctaUrl,
      });

      if (!result.ok) {
        return {
          ok: false as const,
          message: result.message,
          fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
        };
      }

      const { id, slug } = result.data;

      if (demoMode) {
        setProjects((prev) => [
          {
            id,
            slug,
            name: input.name,
            description: input.description || `Testimonials for ${input.name}.`,
            ctaLabel: input.ctaLabel,
            ctaUrl: input.ctaUrl,
            createdAt: new Date().toISOString(),
            counts: { submitted: 0, approved: 0, pending: 0, rejected: 0 },
          },
          ...prev,
        ]);
        setTestimonialsByProject((prev) => ({ ...prev, [id]: [] }));
      }

      return { ok: true as const, id, slug };
    },
    [demoMode]
  );

  const updateProject = React.useCallback(
    async (input: {
      id: string;
      name?: string;
      slug?: string;
      description?: string;
      ctaLabel?: string | null;
      ctaUrl?: string | null;
      isPublished?: boolean;
    }) => {
      const result = await updateProjectAction(input);
      if (!result.ok) return { ok: false as const, message: result.message };

      if (demoMode) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === input.id
              ? {
                  ...p,
                  name: input.name ?? p.name,
                  slug: input.slug ?? p.slug,
                  description: input.description ?? p.description,
                }
              : p
          )
        );
      }
      return { ok: true as const };
    },
    [demoMode]
  );

  const deleteProject = React.useCallback(
    async (id: string) => {
      const result = await deleteProjectAction({ id });
      if (!result.ok) return { ok: false as const, message: result.message };

      if (demoMode) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setTestimonialsByProject((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      return { ok: true as const };
    },
    [demoMode]
  );

  const value = React.useMemo(
    () => ({
      projects,
      testimonialsByProject,
      demoMode,
      moderate,
      createProject,
      updateProject,
      deleteProject,
    }),
    [
      projects,
      testimonialsByProject,
      demoMode,
      moderate,
      createProject,
      updateProject,
      deleteProject,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useDashboard must be used within DashboardStoreProvider");
  return ctx;
}