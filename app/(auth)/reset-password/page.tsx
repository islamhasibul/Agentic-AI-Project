import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Proofly account.",
};

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mb-6 text-sm text-ink-600">
        You followed a valid reset link. Set a new password to finish.
      </p>
      <Suspense>
        <ResetPasswordForm supabaseConfigured={isSupabaseConfigured()} />
      </Suspense>
    </div>
  );
}