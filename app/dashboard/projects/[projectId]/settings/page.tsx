import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProjectSettings } from "./client-settings";

export default async function ProjectSettingsPage({
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
        <Link href={`/dashboard/projects/${projectId}`} className="hover:text-ink-800">Inbox</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-ink-800">Settings</span>
      </nav>
      <ProjectSettings projectId={projectId} />
    </div>
  );
}
