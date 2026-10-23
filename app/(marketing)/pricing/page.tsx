import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { PRICING_TIERS, FAQS } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for Proofly.",
};

export default function PricingPage() {
  return (
    <>
      <section className="container-wide py-20 text-center">
        <Badge tone="accent" className="mb-4">Pricing</Badge>
        <h1 className="text-4xl font-semibold sm:text-5xl">
          Start free. Upgrade when it pays for itself.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
          The Free plan is enough to publish your first wall. The Pro plan unlocks
          unlimited walls and the embed widget (P1). No surprises.
        </p>
      </section>

      <section className="container-wide pb-12">
        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((t) => (
            <Card
              key={t.name}
              className={cn(
                "flex h-full flex-col",
                t.highlighted ? "border-ink-900 ring-2 ring-ember-500/30" : ""
              )}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{t.name}</CardTitle>
                {t.highlighted ? <Badge tone="accent">Most popular</Badge> : null}
              </div>
              <CardDescription className="mt-2">{t.blurb}</CardDescription>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
                {t.cadence ? <span className="text-sm text-ink-500">{t.cadence}</span> : null}
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-700">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-sage-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button
                  asChild
                  variant={t.highlighted ? "accent" : "secondary"}
                  className="w-full"
                >
                  <Link href={t.href}>
                    {t.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">
          Prices shown for illustration. Checkout is not yet wired in this demo build.
        </p>
      </section>

      <section className="container-wide pb-20">
        <div className="surface p-8 md:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">Frequently asked</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold text-ink-900">{f.q}</h3>
                <p className="mt-1 text-sm text-ink-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
