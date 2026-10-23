"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/feedback";

/**
 * Dashboard error boundary.
 *
 * A thrown `DataAccessError` (network failure, missing schema, revoked grant)
 * lands here instead of blanking the whole app. The message is intentionally
 * generic: Postgres error text can leak schema details, so it is logged
 * server-side rather than rendered.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[dashboard] render failed:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <ErrorState
        title="Something went wrong"
        description="We couldn't load this page. This is often temporary."
        action={
          <button
            onClick={reset}
            className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800 focus-ring"
          >
            Try again
          </button>
        }
      />
    </div>
  );
}