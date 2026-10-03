import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

// Opaque fills only: badges also sit on cover art (catalog cards), where a
// translucent tint would let the image decide the contrast.
const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-muted-foreground border-border",
  accent: "bg-accent-muted text-accent-muted-foreground border-accent/40",
  success: "bg-success-muted text-success-muted-foreground border-success/40",
  warning: "bg-warning-muted text-warning-muted-foreground border-warning/40",
  danger: "bg-danger-muted text-danger-muted-foreground border-danger/40",
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
