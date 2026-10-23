import Link from "next/link";
import { ArrowRight, Quote, Sparkles, ShieldCheck, Wand2, Globe2, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FEATURE_HIGHLIGHTS, DEMO_TESTIMONIALS_BY_PROJECT } from "@/lib/demo-data";

const WALL_TESTIMONIALS = [
  DEMO_TESTIMONIALS_BY_PROJECT.p_atlas[2],
  DEMO_TESTIMONIALS_BY_PROJECT.p_atlas[3],
  DEMO_TESTIMONIALS_BY_PROJECT.p_atlas[4],
  DEMO_TESTIMONIALS_BY_PROJECT.p_atlas[7],
  DEMO_TESTIMONIALS_BY_PROJECT.p_acme[0],
  DEMO_TESTIMONIALS_BY_PROJECT.p_acme[1],
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogosStrip />
      <FeatureGrid />
      <WallPreview />
      <ModerationPreview />
      <Cta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-96 max-w-3xl rounded-full bg-ember-200/50 blur-3xl"
      />
      <div className="container-wide relative grid items-center gap-12 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
        <div>
          <Badge tone="accent" className="mb-5">New · Multi-tenant by design</Badge>
          <h1 className="text-4xl font-semibold leading-[1.05] text-ink-950 sm:text-5xl md:text-6xl">
            The fastest way to turn happy customers into proof.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600">
            Proofly is a workspace for collecting, moderating, and publishing customer
            testimonials — on a beautiful public wall that lives where you need it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="accent" size="lg" asChild>
              <Link href="/signup">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/features">See how it works</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-ink-500">
            No credit card. One wall, 25 testimonials, forever free.
          </p>
        </div>
        <HeroMock />
      </div>
    </section>
  );
}

function HeroMock() {
  return (
    <div className="relative">
      <div className="surface p-3 shadow-2xl">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-sage-300" />
          <span className="ml-2 text-xs text-ink-500">proofly.com/w/atlas-launch</span>
        </div>
        <div className="grid gap-3 rounded-xl bg-sand-50 p-4">
          <div className="flex items-center gap-3">
            <Avatar name="Priya Raman" size="md" />
            <div>
              <div className="text-sm font-semibold text-ink-900">Priya Raman</div>
              <div className="text-xs text-ink-500">Founder · Loomcraft</div>
            </div>
            <Badge tone="success" className="ml-auto">Featured</Badge>
          </div>
          <p className="text-sm leading-relaxed text-ink-700">
            “I asked twelve customers for testimonials on a Monday and had eight
            published by Friday. Proofly turned a chore into a single afternoon.”
          </p>
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span>★ Helpful · 42</span>
            <span>2d ago</span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-6 hidden w-56 rotate-[-3deg] rounded-xl border border-ink-100 bg-white p-3 shadow-soft sm:block">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-sage-100 text-sage-700">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-ink-800">Approved by you</span>
        </div>
        <div className="mt-2 text-xs text-ink-500">Visible on public wall</div>
      </div>
    </div>
  );
}

function LogosStrip() {
  const items = ["Atlas", "Northbeam", "Helio", "Quartz", "Bloom", "Acme", "Designworks"];
  return (
    <section aria-label="Trusted by" className="border-y border-ink-100 bg-white">
      <div className="container-wide flex flex-col items-center gap-6 py-10">
        <p className="text-xs uppercase tracking-widest text-ink-500">
          Trusted by teams shipping weekly
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-base font-semibold text-ink-400">
          {items.map((i) => (
            <span key={i} className="opacity-80">
              {i}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="container-wide py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
          Built for the way social proof actually works
        </h2>
        <p className="mt-4 text-base text-ink-600">
          Five things every testimonial workflow needs, none of the things you don't.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_HIGHLIGHTS.map((f) => (
          <Card key={f.title} className="h-full">
            <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-white">
              <f.icon className="h-5 w-5" aria-hidden />
            </span>
            <CardTitle>{f.title}</CardTitle>
            <CardDescription className="mt-2">{f.description}</CardDescription>
          </Card>
        ))}
      </div>
    </section>
  );
}

function WallPreview() {
  return (
    <section className="bg-ink-950 py-20 text-white">
      <div className="container-wide grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div>
          <Badge tone="accent">Public wall</Badge>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            A wall your customers will actually read.
          </h2>
          <p className="mt-4 text-ink-300">
            Server-rendered for SEO, fast on every device, and only shows the
            testimonials you've approved. Featured quotes rise to the top.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-ink-200">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ember-400" /> Featured-first sort
            </li>
            <li className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-ember-400" /> Clean, quote-first typography
            </li>
            <li className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-ember-400" /> Server-rendered for instant loads
            </li>
          </ul>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {WALL_TESTIMONIALS.slice(0, 4).map((t) => (
            <article
              key={t.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <Quote className="h-5 w-5 text-ember-400" />
              <p className="mt-3 text-sm leading-relaxed text-ink-100">"{t.content}"</p>
              <div className="mt-4 flex items-center gap-2">
                <Avatar name={t.authorName} size="sm" />
                <div>
                  <div className="text-xs font-semibold text-white">{t.authorName}</div>
                  <div className="text-[11px] text-ink-300">
                    {t.authorRole} · {t.authorCompany}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModerationPreview() {
  return (
    <section className="container-wide py-20">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <Badge tone="warning">Inbox</Badge>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            One inbox. Every submission. Zero spreadsheets.
          </h2>
          <p className="mt-4 text-ink-600">
            Approve, reject, feature, or hide in a single click. Featured quotes
            sort first on your wall; rejected ones stay private.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="success">Approved · 17</Badge>
            <Badge tone="warning">Pending · 4</Badge>
            <Badge tone="danger">Rejected · 3</Badge>
          </div>
        </div>
        <div className="surface p-4">
          {[
            { name: "Maya Okafor", status: "warning", label: "Pending", text: "Atlas cut our review cycle from two days to twenty minutes…" },
            { name: "Jordan Park", status: "warning", label: "Pending", text: "We embedded the public wall on our marketing site the same hour we created it." },
            { name: "Priya Raman", status: "success", label: "Approved", text: "I asked twelve customers for testimonials on a Monday…" },
          ].map((row) => (
            <div key={row.name} className="flex items-start gap-3 border-b border-ink-100 py-3 last:border-0">
              <Avatar name={row.name} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">{row.name}</span>
                  <Badge tone={row.status as "warning" | "success"}>{row.label}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-600">{row.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="container-wide pb-24">
      <div className="surface relative overflow-hidden p-10 text-center md:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ember-100 blur-3xl"
        />
        <h2 className="relative text-3xl font-semibold sm:text-4xl">
          Ready to publish your first wall?
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-ink-600">
          A few minutes of setup, and you'll have a shareable wall you can ship
          to your marketing site today.
        </p>
        <div className="relative mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="accent" size="lg" asChild>
            <Link href="/signup">
              Get started — it's free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
