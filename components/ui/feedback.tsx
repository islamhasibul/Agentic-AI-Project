import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
      {Icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-50 text-ink-500">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-100", className)} />;
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <h3 className="text-sm font-semibold text-red-700">{title}</h3>
      {description ? <p className="mt-1 text-sm text-red-700/80">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function SuccessBanner({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div role="status" className="rounded-2xl border border-sage-200 bg-sage-50 p-6">
      <h3 className="text-sm font-semibold text-sage-700">{title}</h3>
      {description ? <p className="mt-1 text-sm text-sage-700/80">{description}</p> : null}
    </div>
  );
}

export function DemoBanner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border border-ember-200 bg-ember-50 px-4 py-2.5 text-xs font-medium text-ember-800",
        className
      )}
    >
      Demo data — nothing here is connected to a database.
    </div>
  );
}
