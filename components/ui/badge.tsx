import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-muted border-border",
  accent: "bg-accent-muted text-accent-hover border-accent/40",
  success: "bg-emerald-950 text-emerald-400 border-emerald-900",
  warning: "bg-amber-950 text-amber-400 border-amber-900",
  danger: "bg-red-950 text-red-400 border-red-900",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    />
  );
}
