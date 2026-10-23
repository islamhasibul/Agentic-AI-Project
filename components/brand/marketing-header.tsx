"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

const linkBase =
  "inline-flex items-center justify-center rounded-full font-medium focus-ring transition-colors";
const ghostLink =
  "h-9 px-4 text-sm text-ink-700 hover:bg-white";
const accentLink =
  "h-9 px-4 text-sm bg-ember-500 text-white hover:bg-ember-600 shadow-soft";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/dashboard", label: "Dashboard" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100/60 bg-sand-50/80 backdrop-blur">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link href="/" aria-label="Proofly home" className="focus-ring rounded-md">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium focus-ring",
                  active ? "bg-white text-ink-900 shadow-soft" : "text-ink-600 hover:text-ink-900"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className={cn(linkBase, ghostLink)}>
            Log in
          </Link>
          <Link href="/signup" className={cn(linkBase, accentLink)}>
            Get started
          </Link>
        </div>
        <button
          className="rounded-full p-2 text-ink-700 hover:bg-white md:hidden focus-ring"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <div id="mobile-menu" className="border-t border-ink-100 bg-white md:hidden">
          <nav className="container-wide flex flex-col gap-1 py-3" aria-label="Mobile primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 px-3 pb-3">
              <Link href="/login" className="rounded-full border border-ink-200 px-4 py-2 text-center text-sm font-medium">
                Log in
              </Link>
              <Link href="/signup" className="rounded-full bg-ember-500 px-4 py-2 text-center text-sm font-medium text-white">
                Get started
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
