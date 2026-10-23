"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X, Eye, EyeOff, Star, Inbox, Filter, Loader2, Copy } from "lucide-react";
import { useDashboard } from "@/components/dashboard/projects-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "../../client-overview";
import { useToast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils";
import type { Testimonial, TestimonialStatus } from "@/lib/demo-data";

type Filter = "all" | TestimonialStatus;

export function ProjectInbox({ projectId }: { projectId: string }) {
  const { projects, testimonialsByProject, moderate } = useDashboard();
  const project = projects.find((p) => p.id === projectId);
  const [filter, setFilter] = React.useState<Filter>("pending");
  const [query, setQuery] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const toast = useToast();

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        description="This wall may have been removed."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/projects">All projects</Link>
          </Button>
        }
      />
    );
  }

  const list = testimonialsByProject[project.id] ?? [];
  const counts = {
    all: list.length,
    pending: list.filter((t) => t.status === "pending").length,
    approved: list.filter((t) => t.status === "approved").length,
    rejected: list.filter((t) => t.status === "rejected").length,
    hidden: list.filter((t) => t.status === "hidden").length,
  } satisfies Record<Filter, number>;

  const filtered = list
    .filter((t) => (filter === "all" ? true : t.status === filter))
    .filter((t) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        t.authorName.toLowerCase().includes(q) ||
        (t.authorEmail?.toLowerCase().includes(q) ?? false) ||
        t.content.toLowerCase().includes(q)
      );
    })
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        +new Date(b.createdAt) - +new Date(a.createdAt)
    );

  const doAction = async (
    t: Testimonial,
    action: "approve" | "reject" | "hide" | "feature" | "unfeature"
  ) => {
    setPendingId(t.id);
    const ok = await moderate(project.id, t.id, action);
    setPendingId(null);

    if (!ok) {
      toast.show({
        title: "Couldn't apply that",
        description: "You may not have permission, or the wall changed. Try again.",
      });
      return;
    }

    toast.show({
      title:
        action === "approve"
          ? "Approved"
          : action === "reject"
            ? "Rejected"
            : action === "hide"
              ? "Hidden"
              : action === "feature"
                ? "Featured"
                : "Unfeatured",
      description: `${t.authorName}'s testimonial.`,
    });
  };

  const copySubmit = () => {
    const url = `${window.location.origin}/w/${project.slug}/submit`;
    navigator.clipboard?.writeText(url);
    toast.show({ title: "Collection link copied", description: url });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <CardDescription>{project.description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/w/${project.slug}`} target="_blank">
              View public wall
            </Link>
          </Button>
          <Button variant="accent" size="sm" onClick={copySubmit}>
            <Copy className="h-4 w-4" />
            Copy collection link
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatPill label="Submitted" value={project.counts.submitted} />
        <StatPill label="Pending" value={counts.pending} accent />
        <StatPill label="Approved" value={counts.approved} />
        <StatPill label="Rejected" value={project.counts.rejected} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="pending">Pending · {counts.pending}</TabsTrigger>
              <TabsTrigger value="approved">Approved · {counts.approved}</TabsTrigger>
              <TabsTrigger value="rejected">Rejected · {counts.rejected}</TabsTrigger>
              <TabsTrigger value="hidden">Hidden · {counts.hidden}</TabsTrigger>
              <TabsTrigger value="all">All · {counts.all}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, content…"
              className="h-9 w-64 rounded-lg border border-ink-200 px-3 text-sm focus-ring"
            />
          </div>
        </div>

        <TabsContent value={filter}>
          {filtered.length === 0 ? (
            <EmptyState
              title={filter === "pending" ? "Inbox zero" : "Nothing here yet"}
              description={
                filter === "pending"
                  ? "You're all caught up. New submissions will appear here."
                  : "Once testimonials match this status, they'll show up here."
              }
              icon={Inbox}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {filtered.map((t) => (
                <li key={t.id} className="grid gap-3 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex items-start gap-3">
                    <Avatar name={t.authorName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-900">{t.authorName}</span>
                        <StatusBadge status={t.status} />
                        {t.featured ? <span className="text-xs font-medium text-ember-700">★ Featured</span> : null}
                      </div>
                      <div className="text-xs text-ink-500">
                        {(t.authorRole || "—") + " · " + (t.authorCompany || "—")} · {formatRelative(t.createdAt)}
                      </div>
                      <p className="mt-2 text-sm text-ink-800">{t.content}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {t.status !== "approved" ? (
                      <Button size="sm" variant="accent" onClick={() => doAction(t, "approve")} disabled={pendingId === t.id}>
                        {pendingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Approve
                      </Button>
                    ) : null}
                    {t.status !== "rejected" ? (
                      <Button size="sm" variant="secondary" onClick={() => doAction(t, "reject")} disabled={pendingId === t.id}>
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    ) : null}
                    {t.status === "approved" ? (
                      <Button size="sm" variant="secondary" onClick={() => doAction(t, "hide")} disabled={pendingId === t.id}>
                        <EyeOff className="h-4 w-4" />
                        Hide
                      </Button>
                    ) : null}
                    {t.status === "approved" ? (
                      t.featured ? (
                        <Button size="sm" variant="ghost" onClick={() => doAction(t, "unfeature")}>
                          <Star className="h-4 w-4" />
                          Unfeature
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => doAction(t, "feature")} disabled={pendingId === t.id}>
                          <Star className="h-4 w-4" />
                          Feature
                        </Button>
                      )
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Card>
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="surface flex items-center justify-between p-4">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</span>
      <span className={"text-2xl font-semibold " + (accent ? "text-ember-700" : "text-ink-900")}>
        {value}
      </span>
    </div>
  );
}
