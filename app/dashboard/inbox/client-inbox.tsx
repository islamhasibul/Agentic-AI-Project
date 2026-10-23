"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X, Star, Inbox, Loader2 } from "lucide-react";
import { useDashboard } from "@/components/dashboard/projects-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "../client-overview";
import { useToast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils";

export function UnifiedInbox() {
  const { projects, testimonialsByProject, moderate } = useDashboard();
  const [pending, setPending] = React.useState<string | null>(null);
  const toast = useToast();

  const items = Object.entries(testimonialsByProject)
    .flatMap(([pid, list]) =>
      list
        .filter((t) => t.status === "pending")
        .map((t) => ({ ...t, _project: projects.find((p) => p.id === pid) }))
    )
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const doAction = async (projectId: string, tId: string, action: "approve" | "reject") => {
    setPending(tId);
    await new Promise((r) => setTimeout(r, 200));
    moderate(projectId, tId, action);
    setPending(null);
    toast.show({ title: action === "approve" ? "Approved" : "Rejected" });
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="Inbox zero"
        description="All caught up. New submissions will land here."
        icon={Inbox}
      />
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-ink-100">
        {items.map((t) => (
          <li key={`${t._project?.id}-${t.id}`} className="grid gap-3 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-3">
              <Avatar name={t.authorName} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-900">{t.authorName}</span>
                  <StatusBadge status={t.status} />
                  <Link
                    href={`/dashboard/projects/${t._project?.id ?? ""}`}
                    className="text-xs font-medium text-ink-500 hover:text-ink-800"
                  >
                    on {t._project?.name ?? "—"}
                  </Link>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-700">{t.content}</p>
                <p className="mt-1 text-xs text-ink-500">{formatRelative(t.createdAt)}</p>
              </div>
            </div>
            <div className="flex gap-2 lg:justify-end">
              <Button
                size="sm"
                variant="accent"
                disabled={pending === t.id || !t._project}
                onClick={() => t._project && doAction(t._project.id, t.id, "approve")}
              >
                {pending === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending === t.id || !t._project}
                onClick={() => t._project && doAction(t._project.id, t.id, "reject")}
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
