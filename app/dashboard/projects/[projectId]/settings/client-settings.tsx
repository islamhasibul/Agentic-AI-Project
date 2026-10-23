"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Check, Trash2, Code2 } from "lucide-react";
import { useDashboard } from "@/components/dashboard/projects-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function ProjectSettings({ projectId }: { projectId: string }) {
  const { projects, testimonialsByProject, updateProject, deleteProject, demoMode } = useDashboard();
  const router = useRouter();
  const project = projects.find((p) => p.id === projectId);
  const [confirm, setConfirm] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [copied, setCopied] = React.useState<"submit" | "embed" | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [form, setForm] = React.useState<{
    name: string;
    slug: string;
    description: string;
    ctaLabel: string;
    ctaUrl: string;
  } | null>(null);
  const toast = useToast();

  // Seed the editable form once per project, so re-renders don't clobber typing.
  const editable = React.useMemo(() => {
    if (!project) return null;
    if (!form) {
      return {
        name: project.name,
        slug: project.slug,
        description: project.description,
        ctaLabel: project.ctaLabel ?? "",
        ctaUrl: project.ctaUrl ?? "",
      };
    }
    return form;
  }, [project, form]);

  if (!project || !editable) {
    return (
      <EmptyState
        title="Project not found"
        description="It may have been removed."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/projects">All projects</Link>
          </Button>
        }
      />
    );
  }

  const list = testimonialsByProject[project.id] ?? [];
  const isPublished = project.isPublished ?? false;

  const submitUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/w/${project.slug}/submit`;
  const wallUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/w/${project.slug}`;
  const embedSnippet = `<iframe src="${wallUrl}" width="100%" height="600" style="border:0;border-radius:12px" loading="lazy"></iframe>`;

  const copy = (text: string, key: "submit" | "embed") => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    toast.show({ title: "Copied to clipboard" });
    setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <CardDescription>Configure how your wall looks and how people find it.</CardDescription>
      </div>

      <Card>
        <CardTitle>Project details</CardTitle>
        <CardDescription>These show on the public wall and in share previews.</CardDescription>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setSaveError(null);
            const result = await updateProject({
              id: project.id,
              name: editable.name,
              slug: editable.slug,
              description: editable.description,
              ctaLabel: editable.ctaLabel || null,
              ctaUrl: editable.ctaUrl || null,
            });
            setSaving(false);
            if (!result.ok) {
              setSaveError(result.message);
              return;
            }
            setForm(null);
            toast.show({
              title: "Saved",
              description: demoMode ? "Demo mode — nothing was written." : "Your wall is updated.",
            });
          }}
        >
          <Field htmlFor="proj-name" label="Name">
            <Input
              id="proj-name"
              value={editable.name}
              onChange={(e) => setForm({ ...editable, name: e.target.value })}
            />
          </Field>
          <Field htmlFor="proj-slug" label="Public URL slug" hint={`proofly.com/w/${editable.slug || "your-wall"}`}>
            <Input
              id="proj-slug"
              value={editable.slug}
              onChange={(e) => setForm({ ...editable, slug: e.target.value })}
            />
          </Field>
          <Field htmlFor="proj-desc" label="Description" hint="A single sentence.">
            <Textarea
              id="proj-desc"
              value={editable.description}
              onChange={(e) => setForm({ ...editable, description: e.target.value })}
            />
          </Field>
          <Field htmlFor="proj-cta-label" label="Call-to-action label" hint="Optional. Needs a URL below.">
            <Input
              id="proj-cta-label"
              value={editable.ctaLabel}
              onChange={(e) => setForm({ ...editable, ctaLabel: e.target.value })}
              placeholder="Try it free"
            />
          </Field>
          <Field htmlFor="proj-cta-url" label="Call-to-action URL" hint="Must be http:// or https://.">
            <Input
              id="proj-cta-url"
              type="url"
              value={editable.ctaUrl}
              onChange={(e) => setForm({ ...editable, ctaUrl: e.target.value })}
              placeholder="https://example.com"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={isPublished}
              disabled={saving}
              onChange={async (e) => {
                const next = e.target.checked;
                setSaving(true);
                setSaveError(null);
                const result = await updateProject({ id: project.id, isPublished: next });
                setSaving(false);
                if (!result.ok) {
                  setSaveError(result.message);
                  return;
                }
                toast.show({
                  title: next ? "Wall published" : "Wall unpublished",
                  description: next
                    ? "Anyone with the link can now view and submit to it."
                    : "The public wall and its collection link are now private.",
                });
              }}
            />
            <span>
              Published — the public wall and collection link are live.
            </span>
          </label>
          {saveError ? (
            <div className="sm:col-span-2">
              <ErrorState title="Couldn't save" description={saveError} />
            </div>
          ) : null}
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" variant="secondary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Collection link</CardTitle>
        <CardDescription>Send this URL to your customers. Submissions land in your inbox as pending.</CardDescription>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 p-3">
          <code className="flex-1 truncate text-sm text-ink-800">{submitUrl}</code>
          <Button variant="secondary" size="sm" onClick={() => copy(submitUrl, "submit")}>
            {copied === "submit" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "submit" ? "Copied" : "Copy"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Embed (P1)</CardTitle>
        <CardDescription>
          Drop this iframe into your marketing site. Auto-resize arrives next.
        </CardDescription>
        <div className="mt-4 rounded-lg border border-ink-200 bg-ink-950 p-4 text-xs text-ink-100">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all">{embedSnippet}</pre>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => copy(embedSnippet, "embed")}>
            {copied === "embed" ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
            {copied === "embed" ? "Copied" : "Copy snippet"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle className="text-red-700">Danger zone</CardTitle>
        <CardDescription>
          Deleting this project removes its {list.length} testimonials. This action cannot be undone.
        </CardDescription>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setConfirm(true)}>
            <Trash2 className="h-4 w-4" />
            Delete project
          </Button>
        </div>
      </Card>

      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this project?"
        description="Type the project name to confirm. This will permanently remove the wall and all of its testimonials."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={confirmText !== project.name}
              onClick={async () => {
                setDeleting(true);
                const result = await deleteProject(project.id);
                setDeleting(false);
                if (!result.ok) {
                  setConfirm(false);
                  setSaveError(result.message);
                  return;
                }
                setConfirm(false);
                toast.show({
                  title: "Project deleted",
                  description: demoMode ? "Demo mode — nothing was written." : undefined,
                });
                router.push("/dashboard/projects");
                router.refresh();
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <Field htmlFor="confirm" label={`Type "${project.name}" to confirm`} required>
          <Input
            id="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
          />
        </Field>
      </Dialog>
    </div>
  );
}
