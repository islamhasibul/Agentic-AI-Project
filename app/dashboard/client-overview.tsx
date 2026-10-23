"use client";

import Link from "next/link";
import { ArrowRight, Inbox, Eye, FolderKanban, Sparkles } from "lucide-react";
import { useDashboard } from "@/components/dashboard/projects-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/feedback";
import { formatRelative } from "@/lib/utils";

export function ClientOverview() {
  const { projects, testimonialsByProject } = useDashboard();

  const totalApproved = projects.reduce((acc, p) => acc + p.counts.approved, 0);
  const totalPending = projects.reduce((acc, p) => acc + p.counts.pending, 0);
  const totalSubmitted = projects.reduce((acc, p) => acc + p.counts.submitted, 0);

  const recent = Object.entries(testimonialsByProject)
    .flatMap(([pid, list]) => list.map((t) => ({ ...t, _projectId: pid, _projects: projects })))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={FolderKanban} label="Projects" value={projects.length} />
        <Stat icon={Inbox} label="Pending review" value={totalPending} accent />
        <Stat icon={Sparkles} label="Approved" value={totalApproved} />
        <Stat icon={Eye} label="Views, last 7d" value={"1,842"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle>Recent submissions</CardTitle>
              <CardDescription>Newest {recent.length} across your walls.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/inbox">
                Open inbox
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              description="Share a collection link to start receiving testimonials."
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {recent.map((t) => {
                const project = projects.find((p) => p.id === t._projectId);
                return (
                  <li key={`${t._projectId}-${t.id}`} className="flex items-start gap-3 py-3">
                    <Avatar name={t.authorName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink-900">
                          {t.authorName}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="line-clamp-1 text-sm text-ink-600">{t.content}</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {project?.name ?? "Unknown project"} · {formatRelative(t.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Your projects</CardTitle>
          <CardDescription>{projects.length} total · {totalSubmitted} submissions all time.</CardDescription>
          <ul className="mt-4 space-y-2">
            {projects.slice(0, 4).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm hover:bg-ink-50"
                >
                  <span className="truncate font-medium text-ink-900">{p.name}</span>
                  <Badge tone="info">{p.counts.approved} approved</Badge>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard/projects">All projects</Link>
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="surface flex items-center gap-3 p-4">
      <span
        className={
          "grid h-10 w-10 place-items-center rounded-xl " +
          (accent ? "bg-ember-100 text-ember-700" : "bg-ink-100 text-ink-700")
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</div>
        <div className="text-2xl font-semibold text-ink-900">{value}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge tone="warning">Pending</Badge>;
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rejected</Badge>;
  if (status === "hidden") return <Badge tone="neutral">Hidden</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
}
