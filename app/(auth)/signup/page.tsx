import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForms } from "@/components/auth/auth-forms";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create your workspace",
  description: "Sign up for Proofly and start collecting testimonials.",
};

export default function SignupPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Create your workspace</h1>
      <p className="mb-6 text-sm text-ink-600">
        One wall, 25 testimonials, free forever. Upgrade when you're ready.
      </p>
      <Suspense>
        <AuthForms supabaseConfigured={isSupabaseConfigured()} />
      </Suspense>
    </div>
  );
}
