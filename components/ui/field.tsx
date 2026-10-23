import * as React from "react";
import { cn } from "@/lib/utils";

export const FieldHint = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-xs text-ink-500", className)} {...props} />
);

export const FieldError = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p role="alert" className={cn("text-xs font-medium text-red-600", className)} {...props} />
);

export const Field = ({
  label,
  hint,
  error,
  htmlFor,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium text-ink-800">
      {label}
      {required ? <span className="ml-1 text-ember-600">*</span> : null}
    </label>
    {children}
    {error ? <FieldError>{error}</FieldError> : hint ? <FieldHint>{hint}</FieldHint> : null}
  </div>
);
