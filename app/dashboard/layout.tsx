import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardStoreProvider } from "@/components/dashboard/projects-context";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/feedback";
import { getViewer } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/env";
import { ensureProfileForCurrentUser } from "@/app/(auth)/actions";
import { DataAccessError, listProjects, listTestimonialsForProject } from "@/lib/data/queries";
import { DEMO_USER, type Testimonial } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s · Proofly",
  },
  robots: {
    // The dashboard must never be indexed.
    index: false,
    follow: false,
  },
};

/**
 * The dashboard shell depends on the caller's session (which user to show, and
 * whether to redirect to /login). Force per-request rendering so the auth gate
 * below is always evaluated against the live session cookies. Without this,
 * Next could prerender the layout as a static shell and serve it to anonymous
 * visitors without ever running the gate.
 */
export const dynamic = "force-dynamic";

/**
 * Dashboard gate + data loader.
 *
 * Every route under `/dashboard` renders through this layout, so a single
 * check here protects the entire dashboard tree (F-AUTH-6).
 *
 * - When Supabase IS configured: an unauthenticated visitor is redirected to
 *   `/login`. The `next` value is validated downstream by `safeRedirectPath`,
 *   so it cannot be abused for an off-origin redirect.
 * - When Supabase is NOT configured (demo mode): access is allowed through so
 *   the demo UI stays reviewable with zero setup.
 *
 * When configured, this also runs the owner-scoped reads and hands the result
 * to the client provider as initial state. Those reads are RLS-filtered, so a
 * user only ever sees their own rows — the same guarantee the server components
 * below get independently.
 *
 * Note: this gate is defense in depth, not the primary control. The
 * authoritative enforcement layer is Postgres RLS — a redirect here cannot be
 * trusted to protect data, because data access goes through the anon-key
 * client which RLS governs independently.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();
  // `getViewer` is React-`cache`d, so this is at most one token verification.
  const viewer = configured ? await getViewer() : null;

  if (configured && !viewer) {
    redirect("/login");
  }

  if (viewer) {
    // Best-effort: make sure the profile row exists before any data layer
    // queries it. Non-fatal if it fails.
    await ensureProfileForCurrentUser();
  }

  // Load owner-scoped data for the client provider. In demo mode these return
  // `null` and the provider falls back to its built-in fixtures.
  let projects = null as Awaited<ReturnType<typeof listProjects>>;
  let testimonialsByProject: Record<string, Testimonial[]> = {};
  let loadError: string | null = null;

  if (configured) {
    try {
      projects = await listProjects();
      if (projects) {
        const rows = await Promise.all(
          projects.map(async (p) => [p.id, await listTestimonialsForProject(p.id)] as const)
        );
        // Drop the `null` (not-configured) case so the map stays dense.
        testimonialsByProject = Object.fromEntries(
          rows.flatMap(([id, list]) => (list ? [[id, list] as const] : []))
        );
      }
    } catch (e) {
      // A failed read must render an error state, not an empty dashboard that
      // reads as "you have no projects yet".
      loadError =
        e instanceof DataAccessError
          ? e.message
          : "Could not load your dashboard. Please refresh to try again.";
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <ErrorState
          title="We couldn't load your dashboard"
          description={loadError}
          action={
            <a
              href="/dashboard"
              className="text-sm font-medium text-ink-900 underline underline-offset-4"
            >
              Try again
            </a>
          }
        />
      </div>
    );
  }

  return (
    <ToastProvider>
      <DashboardStoreProvider
        demoMode={!configured}
        initialProjects={projects ?? undefined}
        initialTestimonialsByProject={testimonialsByProject}
      >
        <DashboardShell
          user={
            viewer
              ? { name: viewer.name ?? "Member", email: viewer.email ?? "" }
              : { name: DEMO_USER.name, email: DEMO_USER.email }
          }
          demoMode={!configured}
        >
          {children}
        </DashboardShell>
      </DashboardStoreProvider>
    </ToastProvider>
  );
}