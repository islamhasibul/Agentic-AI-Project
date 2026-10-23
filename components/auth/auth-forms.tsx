"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { SuccessBanner, ErrorState } from "@/components/ui/feedback";
import { signInAction, signUpAction } from "@/app/(auth)/actions";

type Mode = "login" | "signup";

interface FormState {
  email: string;
  password: string;
  name?: string;
}

const initial: FormState = { email: "", password: "", name: "" };

function validate(mode: Mode, s: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (mode === "signup" && (!s.name || s.name.trim().length < 2)) {
    e.name = "Please enter your name.";
  }
  if (!s.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) {
    e.email = "Enter a valid email address.";
  }
  if (!s.password || s.password.length < 8) {
    e.password = "Use at least 8 characters.";
  }
  return e;
}

export function AuthForms({ supabaseConfigured = false }: { supabaseConfigured?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const initialMode: Mode = params.get("mode") === "signup" ? "signup" : "login";
  // `next` is untrusted. It is forwarded to the server action, which re-validates
  // it with `safeRedirectPath` before redirecting. Never redirect client-side.
  const next = params.get("next") ?? undefined;
  const authError = params.get("error");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [values, setValues] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const update =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
    };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    const e2 = validate(mode, values);
    setErrors(e2);
    if (Object.keys(e2).length > 0) return;
    setStatus("loading");

    // In demo mode there is no backend, so keep the previous simulated
    // behaviour rather than calling a server action that will no-op.
    if (!supabaseConfigured) {
      await new Promise((r) => setTimeout(r, 700));
      if (mode === "signup") {
        setStatus("success");
      } else {
        router.push("/dashboard");
      }
      return;
    }

    try {
      if (mode === "signup") {
        const result = await signUpAction({
          email: values.email,
          password: values.password,
          name: values.name,
          next,
        });
        if (!result.ok) {
          setStatus("error");
          setServerError(result.message);
          if (result.fieldErrors) {
            setErrors({
              email: result.fieldErrors.email?.[0],
              password: result.fieldErrors.password?.[0],
              name: result.fieldErrors.name?.[0],
            });
          }
          return;
        }
        setSuccessMessage(result.message);
        setStatus("success");
      } else {
        // On success the action redirects, so we never return here.
        await signInAction({ email: values.email, password: values.password, next });
        // Defensive: if the action ever returns instead of redirecting
        // (e.g. a future non-redirect success path), refresh so server
        // components re-run with the new session cookies.
        router.refresh();
      }
    } catch {
      setStatus("error");
      setServerError("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="surface p-6">
        <SuccessBanner
          title={successMessage ? "Almost there" : "Demo mode — check your email"}
          description={
            successMessage ??
            "In a real build, a confirmation link would be on its way. Click it to activate your workspace."
          }
        />
        {!successMessage ? (
          <p className="mt-4 text-sm text-ink-600">
            We didn&apos;t actually create the account — Supabase is not yet wired to this build.
          </p>
        ) : null}
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
      <Tabs defaultValue={mode} value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="w-full">
          <TabsTrigger value="login">Log in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>
        <TabsContent value={mode}>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            {mode === "signup" ? (
              <Field htmlFor="name" label="Your name" required error={errors.name}>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Input
                    id="name"
                    autoComplete="name"
                    value={values.name ?? ""}
                    onChange={update("name")}
                    placeholder="Avery Chen"
                    className="pl-9"
                    aria-invalid={!!errors.name}
                  />
                </div>
              </Field>
            ) : null}

            <Field htmlFor="email" label="Work email" required error={errors.email}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={update("email")}
                  placeholder="you@company.com"
                  className="pl-9"
                  aria-invalid={!!errors.email}
                />
              </div>
            </Field>

            <Field
              htmlFor="password"
              label={mode === "signup" ? "Create a password" : "Password"}
              required
              error={errors.password}
              hint={mode === "signup" ? "At least 8 characters." : undefined}
            >
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={values.password}
                  onChange={update("password")}
                  placeholder="••••••••"
                  className="pl-9"
                  aria-invalid={!!errors.password}
                />
              </div>
            </Field>

            {authError ? (
              <FieldError>
                {authError === "invalid_link"
                  ? "That sign-in link is invalid or has expired. Please try again."
                  : "We couldn't complete that request. Please try again."}
              </FieldError>
            ) : null}

            {serverError ? <FieldError>{serverError}</FieldError> : null}

            {status === "error" ? (
              <ErrorState
                title="Something went wrong"
                description="Please try again in a moment."
              />
            ) : null}

            <Button
              type="submit"
              variant="accent"
              className="w-full"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "signup" ? "Creating your workspace…" : "Signing you in…"}
                </>
              ) : mode === "signup" ? (
                "Create workspace"
              ) : (
                "Log in"
              )}
            </Button>

            {mode === "login" ? (
              <p className="text-center text-xs text-ink-500">
                <Link href="/forgot-password" className="focus-ring rounded underline-offset-2 hover:underline">
                  Forgot your password?
                </Link>
              </p>
            ) : null}

            <p className="text-center text-xs text-ink-500">
              {supabaseConfigured
                ? "By continuing you agree to the Terms and Privacy Policy."
                : "Demo build — submissions are not stored."}
            </p>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
