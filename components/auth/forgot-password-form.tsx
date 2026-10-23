"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { SuccessBanner } from "@/components/ui/feedback";
import { requestPasswordResetAction } from "@/app/(auth)/actions";

export function ForgotPasswordForm({ supabaseConfigured = false }: { supabaseConfigured?: boolean }) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setMessage(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    setStatus("loading");
    const result = await requestPasswordResetAction({ email });
    setStatus("done");
    setMessage(result.message);
  }

  if (status === "done") {
    return (
      <div className="surface p-6">
        <SuccessBanner
          title="Check your email"
          description={
            message ??
            "If an account exists for that email, a reset link is on its way."
          }
        />
        <div className="mt-6">
          <Button asChild variant="secondary" className="w-full">
            <Link href="/login">Back to log in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-6">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field
          htmlFor="email"
          label="Work email"
          required
          error={fieldError ?? undefined}
          hint="We'll send a link to set a new password."
        >
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="pl-9"
              aria-invalid={!!fieldError}
            />
          </div>
        </Field>

        {message ? <FieldError>{message}</FieldError> : null}

        <Button type="submit" variant="accent" className="w-full" disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </Button>

        <p className="text-center text-xs text-ink-500">
          {supabaseConfigured
            ? "The link expires after one hour."
            : "Demo build — no email is actually sent."}
        </p>
      </form>
    </div>
  );
}