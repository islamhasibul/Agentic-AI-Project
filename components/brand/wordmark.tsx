import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink-900", className)}>
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-md bg-ink-900 text-white"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11.5 6 8l3 3 4-5" />
        </svg>
      </span>
      Proofly
    </span>
  );
}
