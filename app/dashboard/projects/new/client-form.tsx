"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";
import { useDashboard } from "@/components/dashboard/projects-context";
import { slugify } from "@/lib/utils";

export function NewProjectForm() {
  const router = useRouter();
  const { createProject, demoMode } = useDashboard();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [slugOverride, setSlugOverride] = React.useState("");
  const [errors, setErrors] = React.useState<{ name?: string; slug?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading">("idle");

  const computedSlug = React.useMemo(() => slugify(name), [name]);
  const slug = slugOverride || computedSlug;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Give your wall a name.";
    if (!slug || slug.length < 3) errs.slug = "Use at least 3 characters in the URL.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("loading");
    setFormError(null);

    const result = await createProject({
      name: name.trim(),
      slug,
      description: description.trim() || `Testimonials for ${name.trim()}.`,
    });

    if (!result.ok) {
      // Map server-side field errors back onto the inputs.
      if (result.fieldErrors?.name) setErrors((p) => ({ ...p, name: result.fieldErrors?.name?.[0] }));
      if (result.fieldErrors?.slug) setErrors((p) => ({ ...p, slug: result.fieldErrors?.slug?.[0] }));
      setFormError(result.message);
      setStatus("idle");
      return;
    }

    router.push(`/dashboard/projects/${result.id}`);
  }

  return (
    <Card>
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <Field htmlFor="name" label="Project name" required error={errors.name}>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Atlas v2 launch"
            autoFocus
          />
        </Field>

        <Field
          htmlFor="description"
          label="Short description"
          hint="Shown on the public wall above the testimonials."
        >
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this wall about?"
          />
        </Field>

        <Field
          htmlFor="slug"
          label="Public URL"
          required
          hint={`proofly.com/w/${slug || "your-wall"}`}
          error={errors.slug}
        >
          <div className="flex items-stretch overflow-hidden rounded-lg border border-ink-200 bg-white focus-within:ring-2 focus-within:ring-ember-500/30">
            <span className="grid place-items-center bg-ink-50 px-3 text-xs text-ink-500">
              /w/
            </span>
            <input
              id="slug"
              value={slug}
              onChange={(e) => setSlugOverride(slugify(e.target.value))}
              placeholder="atlas-launch"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-ink-900 outline-none"
              autoComplete="off"
            />
          </div>
          {name ? (
            <p className="mt-1 text-xs text-ink-500">
              Auto-generated from name. <button
                type="button"
                onClick={() => setSlugOverride("")}
                className="text-ink-700 underline-offset-2 hover:underline"
              >
                Reset
              </button>
            </p>
          ) : null}
        </Field>

        {formError ? <ErrorState title="Couldn't create project" description={formError} /> : null}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" variant="accent" disabled={status === "loading"}>
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Create project
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/projects">Cancel</Link>
          </Button>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-500">
            <Wand2 className="h-3.5 w-3.5" />
            {demoMode ? "Demo mode — stored in memory only." : "Saved to your account."}
          </span>
        </div>
      </form>
    </Card>
  );
}
