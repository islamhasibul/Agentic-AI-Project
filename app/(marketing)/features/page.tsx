import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MousePointerClick, ShieldCheck, Sparkles, Wand2, Globe2, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Features",
  description: "Everything Proofly does, and a few things it deliberately doesn't.",
};

const SECTIONS = [
  {
    id: "collect",
    label: "Collect",
    title: "A collection link you can send anywhere.",
    description:
      "Each wall has a single, shareable submission link. Open it, fill four fields, hit submit. That's it. Your customer is back to work in 60 seconds.",
    bullets: [
      "Single-link submissions, no account required",
      "Validated author name, email, role, company, and 20–2000 char body",
      "Honeypot + per-IP and per-email rate limits",
      "CSRF-protected form action",
    ],
    icon: MousePointerClick,
  },
  {
    id: "moderate",
    label: "Moderate",
    title: "Approve, reject, feature, or hide.",
    description:
      "An inbox that shows what's pending, what's approved, and what's been rejected. Decisions are a single click; featured items rise to the top of your wall.",
    bullets: [
      "Status filter, search, and pagination",
      "Featured flag for top-of-wall placement",
      "Audit-ready: who moderated and when",
      "Edit approved content with original retained (P1)",
    ],
    icon: ShieldCheck,
  },
  {
    id: "publish",
    label: "Publish",
    title: "A public wall that loads instantly.",
    description:
      "Server-rendered, edge-cached, and styled to feel like part of your brand. Embed it on your site or share its public URL.",
    bullets: [
      "Featured-first sort, then newest",
      "Open Graph metadata for social shares",
      "Edge cache with on-demand revalidation (P1)",
      "Embed via iframe (P1)",
    ],
    icon: Sparkles,
  },
  {
    id: "secure",
    label: "Secure",
    title: "Multi-tenant at the database layer.",
    description:
      "Every protected query goes through a Postgres row-level security policy. Your data is yours, isolated by default — not by convention in app code.",
    bullets: [
      "Row-level security on every table",
      "Service-role key only on the server",
      "CSRF and rate-limited public submissions",
      "HTML-escaped user content at render time",
    ],
    icon: Globe2,
  },
  {
    id: "soon",
    label: "Coming soon",
    title: "Video testimonials, captured in the browser.",
    description:
      "A 60-second capture flow using the MediaRecorder API. Upload to storage, render a <video> element on the public wall. Schema is already in place.",
    bullets: [
      "In-browser recording (P2)",
      "Supabase Storage upload (P2)",
      "Poster frame and lazy loading (P2)",
      "Original upload lifecycle: 90 days (P2)",
    ],
    icon: Wand2,
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="container-wide py-20">
        <Badge tone="accent" className="mb-4">Features</Badge>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">
          Everything you need to ship a testimonial wall. Nothing you don't.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-600">
          Proofly is deliberately small. We make the loop — collect, moderate,
          publish — fast, polished, and trustworthy. The rest of the field is noise.
        </p>
      </section>

      <section className="container-wide grid gap-4 pb-8 md:grid-cols-2 lg:grid-cols-3">
        {[
          "Single-link collection form",
          "Inbox with status filters",
          "Featured-first sort",
          "Edge-cached public wall",
          "Row-level security by default",
          "Open Graph & SEO ready",
        ].map((f) => (
          <div key={f} className="surface flex items-center gap-3 p-4">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sage-100 text-sage-700">
              <ArrowRight className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-ink-800">{f}</span>
          </div>
        ))}
      </section>

      <section className="container-wide space-y-4 pb-20">
        {SECTIONS.map((s, i) => (
          <Card key={s.id} className="grid gap-8 p-8 md:grid-cols-[1.1fr_1fr] md:p-10">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-white">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <Badge tone="info">{s.label}</Badge>
              </div>
              <CardTitle className="text-2xl">{s.title}</CardTitle>
              <CardDescription className="mt-3 text-base text-ink-600">
                {s.description}
              </CardDescription>
            </div>
            <ul className="space-y-3 text-sm text-ink-700">
              {s.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-sage-100 text-sage-700">
                    <Quote className="h-3 w-3" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <section className="container-wide pb-24">
        <div className="surface p-10 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            See it in action
          </h2>
          <p className="mt-2 text-ink-600">
            Browse a live demo wall to feel what your customers will see.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="accent" size="lg" asChild>
              <Link href="/w/atlas-launch">
                Open the demo wall
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/signup">Create your own</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
