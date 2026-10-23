import Link from "next/link";
import { Plus, Copy, ExternalLink, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProjectsList } from "./client-list";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-ink-600">
            Each project is a wall with its own collection link and public page.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/dashboard/projects/new">
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>

      <ProjectsList />
    </div>
  );
}
