"use client";

import * as React from "react";
import Link from "next/link";
import { Quote, Star, ArrowUpRight, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import type { Project, Testimonial } from "@/lib/demo-data";
import { formatRelative } from "@/lib/utils";

export function PublicWall({
  project,
  testimonials,
}: {
  project: Project;
  testimonials: Testimonial[];
}) {
  const [filter, setFilter] = React.useState<"all" | "featured">("all");

  const visible =
    filter === "featured" ? testimonials.filter((t) => t.featured) : testimonials;

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="focus-ring rounded-md" aria-label="Proofly home">
            <Wordmark />
          </Link>
          <Link
            href={`/w/${project.slug}/submit`}
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800 focus-ring"
          >
            Add yours
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="border-b border-ink-100 bg-gradient-to-b from-white to-sand-50">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <Badge tone="accent" className="mb-4">{project.name}</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
            What our customers say
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">{project.description}</p>
          {project.ctaLabel && project.ctaUrl ? (
            <div className="mt-6 flex justify-center">
              <Button variant="accent" size="lg" asChild>
                <a href={project.ctaUrl} target="_blank" rel="noreferrer">
                  {project.ctaLabel}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Sparkles className="h-4 w-4 text-ember-500" />
            {visible.length} testimonial{visible.length === 1 ? "" : "s"} approved
          </div>
          <div className="inline-flex rounded-full border border-ink-200 bg-white p-1 text-sm">
            {(["all", "featured"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={
                  "rounded-full px-3 py-1.5 capitalize " +
                  (filter === k ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50")
                }
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title="No approved testimonials yet"
            description="Be the first to share your experience."
            action={
              <Button asChild variant="accent">
                <Link href={`/w/${project.slug}/submit`}>Add yours</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((t) => (
              <article
                key={t.id}
                className={
                  "surface relative flex h-full flex-col p-6 transition-shadow hover:shadow-ring " +
                  (t.featured ? "ring-1 ring-ember-200" : "")
                }
              >
                {t.featured ? (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-ember-100 px-2 py-0.5 text-xs font-medium text-ember-700">
                    <Star className="h-3 w-3" />
                    Featured
                  </span>
                ) : null}
                <Quote className="h-5 w-5 text-ember-500" aria-hidden />
                <p className="mt-3 flex-1 text-base leading-relaxed text-ink-800">
                  "{t.content}"
                </p>
                <div className="mt-6 flex items-center gap-3 border-t border-ink-100 pt-4">
                  <Avatar name={t.authorName} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink-900">
                      {t.authorName}
                    </div>
                    <div className="truncate text-xs text-ink-500">
                      {(t.authorRole || "") + (t.authorCompany ? ` · ${t.authorCompany}` : "")}
                    </div>
                  </div>
                  <div className="ml-auto text-xs text-ink-400">{formatRelative(t.createdAt)}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20">
        <Card className="text-center">
          <h2 className="text-2xl font-semibold">Have something nice to say?</h2>
          <p className="mt-2 text-ink-600">
            It takes about a minute. We moderate before publishing.
          </p>
          <div className="mt-5 flex justify-center">
            <Button asChild variant="accent" size="lg">
              <Link href={`/w/${project.slug}/submit`}>
                Submit a testimonial
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </section>

      <footer className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-ink-500 sm:flex-row">
          <span>Powered by Proofly</span>
          <Link href="/" className="hover:text-ink-800">Create your own wall</Link>
        </div>
      </footer>
    </div>
  );
}
