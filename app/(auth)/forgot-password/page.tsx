import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password reset link for your Proofly account.",
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mb-6 text-sm text-ink-600">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>
      <Suspense>
        <ForgotPasswordForm supabaseConfigured={isSupabaseConfigured()} />
      </Suspense>
    </div>
  );
}