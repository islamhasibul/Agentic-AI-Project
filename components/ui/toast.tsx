"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Tiny toast: a single, controlled by the dashboard page via setState.
// No portal, no provider — kept minimal.

interface ToastState {
  id: number;
  title: string;
  description?: string;
}

interface ToastCtx {
  show: (t: Omit<ToastState, "id">) => void;
}

const ToastContext = React.createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);
  const show = (t: Omit<ToastState, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  };
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-soft"
            >
              <div className="mt-0.5 text-sage-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-ink-900">{t.title}</div>
                {t.description ? (
                  <div className="text-xs text-ink-500">{t.description}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return { show: () => undefined };
  }
  return ctx;
}

export function cnToast(...xs: Parameters<typeof cn>) {
  return cn(...xs);
}
