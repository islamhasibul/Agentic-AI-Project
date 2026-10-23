import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientOverview } from "./client-overview";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-ink-600">A snapshot of your walls and recent activity.</p>
        </div>
        <Button asChild variant="accent">
          <Link href="/dashboard/projects/new">
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>
      <ClientOverview />
    </div>
  );
}
