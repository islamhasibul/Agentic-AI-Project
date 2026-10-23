import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";
import { ProjectInbox } from "./client-inbox";
import { Button } from "@/components/ui/button";

export default async function ProjectInboxPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-ink-500">
        <Link href="/dashboard/projects" className="hover:text-ink-800">Projects</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-ink-800">Inbox</span>
        <span className="ml-auto">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/projects/${projectId}/settings`}>
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </span>
      </nav>
      <ProjectInbox projectId={projectId} />
    </div>
  );
}
