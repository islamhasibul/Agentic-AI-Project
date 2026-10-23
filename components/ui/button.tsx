"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950 shadow-soft",
        accent:
          "bg-ember-500 text-white hover:bg-ember-600 active:bg-ember-700 shadow-soft",
        secondary:
          "bg-white text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-ink-50",
        ghost:
          "bg-transparent text-ink-700 hover:bg-ink-100",
        link: "bg-transparent text-ink-900 underline-offset-4 hover:underline px-0",
        outline:
          "bg-transparent text-ink-900 border border-ink-200 hover:border-ink-400",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type AsChildProps = {
  asChild?: boolean;
  children?: React.ReactNode;
  className?: string;
};

function mergeClasses(
  child: React.ReactElement,
  extra: string
): React.ReactElement {
  const existing = (child.props as { className?: string }).className;
  return React.cloneElement(child as React.ReactElement<{ className?: string }>, {
    className: cn(extra, existing),
  });
}

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants>,
    AsChildProps {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);
    if (
      asChild &&
      React.isValidElement(children) &&
      // Only treat anchor-ish elements as linkable.
      // We don't enforce at compile-time to avoid extra deps.
      true
    ) {
      return mergeClasses(children, classes);
    }
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
