"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Lock, Check } from "lucide-react";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/brand/wordmark";
import { SuccessBanner, ErrorState } from "@/components/ui/feedback";
import type { Project } from "@/lib/demo-data";
import { submitTestimonialAction } from "@/app/actions/data";

interface FormState {
  authorName: string;
  authorEmail: string;
  authorRole: string;
  authorCompany: string;
  content: string;
  consent: boolean;
  honeypot: string; // must stay empty
}

const initial: FormState = {
  authorName: "",
  authorEmail: "",
  authorRole: "",
  authorCompany: "",
  content: "",
  consent: false,
  honeypot: "",
};

function validate(s: FormState) {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!s.authorName.trim() || s.authorName.trim().length < 2) {
    e.authorName = "Please share your name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.authorEmail)) {
    e.authorEmail = "Enter a valid email address.";
  }
  const trimmed = s.content.trim();
  if (trimmed.length < 20) e.content = "At least 20 characters — tell us a bit more.";
  if (trimmed.length > 2000) e.content = "Keep it under 2000 characters.";
  if (!s.consent) e.consent = "We need your okay to publish this.";
  return e;
}

export function SubmitForm({ project }: { project: Project }) {
  const [values, setValues] = React.useState<FormState>(initial);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverError, setServerError] = React.useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v =
        e.target instanceof HTMLInputElement && e.target.type === "checkbox"
          ? e.target.checked
          : e.target.value;
      setValues((prev) => ({ ...prev, [key]: v as FormState[K] }));
    };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Bot detected. Report success and store nothing, so the bot learns
    // nothing about whether it was caught. The server applies the same rule.
    if (values.honeypot) {
      setStatus("success");
      return;
    }

    const e2 = validate(values);
    setErrors(e2);
    if (Object.keys(e2).length) return;

    setStatus("loading");
    setServerError(null);

    const result = await submitTestimonialAction({
      projectSlug: project.slug,
      authorName: values.authorName.trim(),
      authorEmail: values.authorEmail.trim(),
      authorRole: values.authorRole.trim(),
      authorCompany: values.authorCompany.trim(),
      content: values.content.trim(),
      honeypot: values.honeypot,
    });

    if (result.ok) {
      setStatus("success");
      return;
    }

    // Surface server-side field errors against the matching inputs.
    if (result.fieldErrors) {
      setErrors((prev) => ({ ...prev, ...(result.fieldErrors as Partial<Record<keyof FormState, string>>) }));
    }
    setServerError(result.message);
    setStatus("error");
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-sand-50">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Link href={`/w/${project.slug}`} className="focus-ring rounded-md">
            <Wordmark />
          </Link>
        </div>
        <main className="mx-auto max-w-xl px-6 py-12">
          <Card>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-700">
              <Check className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Thank you, {values.authorName.split(" ")[0] || "friend"}!</h1>
            <p className="mt-2 text-ink-600">
              Your testimonial is in the queue. The {project.name} team will review it before it goes public.
            </p>
            <div className="mt-6">
              <SuccessBanner
                title="Submitted for review"
                description="It will appear on the public wall once the team approves it. Nothing is published automatically."
              />
            </div>
            <div className="mt-6 flex gap-2">
              <Button asChild variant="secondary">
                <Link href={`/w/${project.slug}`}>Back to the wall</Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setValues(initial);
                  setStatus("idle");
                }}
              >
                Submit another
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link href={`/w/${project.slug}`} className="focus-ring rounded-md">
          <Wordmark />
        </Link>
        <Link
          href={`/w/${project.slug}`}
          className="text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          Back to wall
        </Link>
      </div>

      <main className="mx-auto max-w-xl px-6 py-10">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wider text-ink-500">
            {project.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Share your thoughts
          </h1>
          <p className="mt-2 text-ink-600">
            Four fields and a checkbox. The team will review before publishing.
          </p>
        </div>

        <Card>
          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            {/* Honeypot: hidden from real users. */}
            <div aria-hidden className="hidden">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={values.honeypot}
                onChange={update("honeypot")}
              />
            </div>

            <Field htmlFor="authorName" label="Your name" required error={errors.authorName}>
              <Input
                id="authorName"
                value={values.authorName}
                onChange={update("authorName")}
                autoComplete="name"
                placeholder="Avery Chen"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="authorEmail" label="Email" required error={errors.authorEmail}>
                <Input
                  id="authorEmail"
                  type="email"
                  inputMode="email"
                  value={values.authorEmail}
                  onChange={update("authorEmail")}
                  autoComplete="email"
                  placeholder="you@company.com"
                />
              </Field>
              <Field htmlFor="authorRole" label="Role" hint="Optional">
                <Input
                  id="authorRole"
                  value={values.authorRole}
                  onChange={update("authorRole")}
                  autoComplete="organization-title"
                  placeholder="Head of Design"
                />
              </Field>
            </div>

            <Field htmlFor="authorCompany" label="Company" hint="Optional">
              <Input
                id="authorCompany"
                value={values.authorCompany}
                onChange={update("authorCompany")}
                autoComplete="organization"
                placeholder="Acme"
              />
            </Field>

            <Field
              htmlFor="content"
              label="Your testimonial"
              required
              error={errors.content}
              hint={`${values.content.trim().length} / 2000 characters`}
            >
              <Textarea
                id="content"
                rows={6}
                value={values.content}
                onChange={update("content")}
                placeholder="What changed for you? What would you tell a friend?"
              />
            </Field>

            <label className="flex items-start gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={values.consent}
                onChange={update("consent")}
                className="mt-1 h-4 w-4 rounded border-ink-300 text-ember-500 focus-ring"
              />
              <span>
                I'm okay with the {project.name} team publishing this on their public wall after review.
              </span>
            </label>
            {errors.consent ? <FieldError>{errors.consent}</FieldError> : null}

            {status === "error" ? (
              <ErrorState
                title="Couldn't submit"
                description={serverError ?? "Please try again in a moment."}
              />
            ) : null}

            <Button type="submit" variant="accent" className="w-full" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Submit testimonial"
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-500">
              <Lock className="h-3.5 w-3.5" /> No account required. Your email is only used to verify this submission.
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}
