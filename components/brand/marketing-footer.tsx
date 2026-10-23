import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

const SECTIONS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Create account" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "mailto:hello@proofly.demo", label: "Contact" },
      { href: "/features", label: "Help center" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="container-wide grid gap-10 py-14 md:grid-cols-[1.4fr_2fr]">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-sm text-sm text-ink-500">
            Collect, moderate, and publish customer testimonials on a wall you control.
            Built for teams that care about what their customers actually say.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {SECTIONS.map((s) => (
            <div key={s.heading}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
                {s.heading}
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-ink-700">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-ink-900 focus-ring rounded-sm">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="container-wide flex flex-col items-center justify-between gap-2 py-6 text-xs text-ink-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Proofly — demo build.</span>
          <span>Made for the open web.</span>
        </div>
      </div>
    </footer>
  );
}
