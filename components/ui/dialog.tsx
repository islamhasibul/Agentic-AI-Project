"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

// Minimal modal without external deps. Backdrop click + Escape close.
export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-ink-100 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-ink-500">{description}</p>
            ) : null}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 text-ink-400 hover:bg-ink-100 focus-ring"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={cn("text-sm text-ink-700")}>{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
