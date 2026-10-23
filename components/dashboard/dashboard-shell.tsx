"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  Inbox,
  Menu,
  X,
} from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { DemoBanner } from "@/components/ui/feedback";
import { signOutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  children,
  user,
  demoMode = false,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  /** True when Supabase is not configured; shows the demo banner instead. */
  demoMode?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname() ?? "";

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  // A real <form action> posts to the server action, which clears the Supabase
  // session cookies server-side. A plain <Link href="/login"> would leave the
  // session intact and the dashboard would re-authenticate the user on the
  // next navigation.
  const logoutForm = (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-full p-2 text-ink-500 hover:bg-ink-50 focus-ring"
        aria-label="Log out"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </form>
  );

  const logoutButton = (
    <form action={signOutAction} className="w-full">
      <Button type="submit" variant="secondary" className="w-full">
        Log out
      </Button>
    </form>
  );

  return (
    <div className="flex min-h-screen bg-sand-50">
      <aside className="hidden w-64 flex-col border-r border-ink-100 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-ink-100 px-5">
          <Link href="/dashboard" className="focus-ring rounded-md">
            <Wordmark />
          </Link>
        </div>
        <nav aria-label="Dashboard" className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium focus-ring",
                isActive(n.href, n.exact)
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-50"
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink-900">{user.name}</div>
              <div className="truncate text-xs text-ink-500">{user.email}</div>
            </div>
            {logoutForm}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-100 bg-sand-50/80 px-4 backdrop-blur md:hidden">
          <Link href="/dashboard" className="focus-ring rounded-md">
            <Wordmark />
          </Link>
          <button
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="dash-mobile-nav"
            onClick={() => setOpen((o) => !o)}
            className="rounded-full p-2 text-ink-700 hover:bg-white focus-ring"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {open ? (
          <div id="dash-mobile-nav" className="border-b border-ink-100 bg-white p-3 md:hidden">
            <nav aria-label="Mobile dashboard" className="space-y-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                    isActive(n.href, n.exact)
                      ? "bg-ink-900 text-white"
                      : "text-ink-600 hover:bg-ink-50"
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 border-t border-ink-100 pt-3">{logoutButton}</div>
          </div>
        ) : null}

        <div className="px-4 py-4 md:px-8 md:py-6">
          {demoMode ? <DemoBanner className="mb-4" /> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
