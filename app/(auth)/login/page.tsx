import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForms } from "@/components/auth/auth-forms";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Proofly workspace.",
};

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-6 text-sm text-ink-600">
        Log in to manage your walls and moderate new testimonials.
      </p>
      <Suspense>
        <AuthForms supabaseConfigured={isSupabaseConfigured()} />
      </Suspense>
    </div>
  );
}
