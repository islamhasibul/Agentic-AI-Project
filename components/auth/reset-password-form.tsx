"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/feedback";
import { updatePasswordAction } from "@/app/(auth)/actions";

export function ResetPasswordForm({ supabaseConfigured = false }: { supabaseConfigured?: boolean }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setServerError(null);
    if (password.length < 8) {
      setFieldError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFieldError("Passwords do not match.");
      return;
    }
    setStatus("loading");
    try {
      // On success the action redirects to /dashboard.
      await updatePasswordAction({ password });
    } catch {
      setStatus("error");
      setServerError("We could not update your password. Request a new link and try again.");
    }
  }

  return (
    <div className="surface p-6">
      {!supabaseConfigured ? (
        <div className="mb-4">
          <ErrorState
            title="Demo mode"
            description="Supabase is not configured, so password resets are inactive."
          />
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field htmlFor="password" label="New password" required error={fieldError ?? undefined} hint="At least 8 characters.">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-9"
              aria-invalid={!!fieldError}
            />
          </div>
        </Field>

        <Field htmlFor="confirm" label="Confirm new password" required>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
        </Field>

        {serverError ? <FieldError>{serverError}</FieldError> : null}

        <Button type="submit" variant="accent" className="w-full" disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>

        <p className="text-center text-xs text-ink-500">
          <Link href="/login" className="focus-ring rounded underline-offset-2 hover:underline">
            Back to log in
          </Link>
        </p>
      </form>
    </div>
  );
}