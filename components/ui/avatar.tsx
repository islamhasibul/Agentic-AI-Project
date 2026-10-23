import { cn, initials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

// Stable, deterministic background per name so colors don't flicker on re-render.
const palettes = [
  "bg-sage-200 text-sage-800",
  "bg-ember-200 text-ember-800",
  "bg-sand-200 text-ink-800",
  "bg-ink-200 text-ink-900",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, className, size = "md" }: AvatarProps) {
  const tone = palettes[hash(name) % palettes.length];
  return (
    <div
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold uppercase",
        tone,
        sizes[size],
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
