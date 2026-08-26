import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-muted-foreground border-border",
  accent: "bg-accent-muted text-accent-muted-foreground border-accent/40",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
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
