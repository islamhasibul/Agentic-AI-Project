"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, ExternalLink, Settings2, Trash2, Check } from "lucide-react";
import { useDashboard } from "@/components/dashboard/projects-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils";

export function ProjectsList() {
  const { projects } = useDashboard();
  const [copied, setCopied] = React.useState<string | null>(null);
  const toast = useToast();

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Create your first wall to start collecting testimonials."
        action={
          <Button asChild variant="accent">
            <Link href="/dashboard/projects/new">New project</Link>
          </Button>
        }
      />
    );
  }

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/w/${slug}/submit`;
    navigator.clipboard?.writeText(url);
    setCopied(slug);
    toast.show({ title: "Collection link copied", description: url });
    setTimeout(() => setCopied((s) => (s === slug ? null : s)), 1500);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => {
        const submitUrl = `/w/${p.slug}/submit`;
        const wallUrl = `/w/${p.slug}`;
        return (
          <Card key={p.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className="text-lg font-semibold text-ink-900 hover:underline focus-ring rounded-sm"
                >
                  {p.name}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-ink-500">{p.description}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="success">{p.counts.approved} approved</Badge>
              <Badge tone="warning">{p.counts.pending} pending</Badge>
              {p.counts.rejected > 0 ? (
                <Badge tone="danger">{p.counts.rejected} rejected</Badge>
              ) : null}
            </div>

            <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50 p-3">
              <div className="text-xs font-medium uppercase tracking-wider text-ink-500">
                Collection link
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-ink-800">
                  {submitUrl}
                </code>
                <button
                  onClick={() => copyLink(p.slug)}
                  className="rounded-md p-1.5 text-ink-600 hover:bg-white focus-ring"
                  aria-label="Copy collection link"
                >
                  {copied === p.slug ? (
                    <Check className="h-4 w-4 text-sage-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
              <span>Created {formatRelative(p.createdAt)}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/dashboard/projects/${p.id}`}>
                  Open inbox
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={wallUrl} target="_blank">
                  View wall <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="ml-auto">
                <Link href={`/dashboard/projects/${p.id}/settings`} aria-label="Project settings">
                  <Settings2 className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
