"use client";

import { useState } from "react";
import { Star } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** 1-5, or null for "not rated". */
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * A 5-point rating control rendered as 5 stars. Clicking the already-selected
 * star clears the rating. Read-only mode is used on catalog cards; editable
 * mode is used in the item detail form.
 */
export function StarRating({ value, onChange, readOnly, className }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value ?? 0;

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label="Rating out of 5"
    >
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= displayValue;

        if (readOnly) {
          return (
            <Star
              key={starValue}
              className={cn("h-4 w-4", filled ? "fill-accent text-accent" : "text-border")}
            />
          );
        }

        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} out of 5`}
            className="focus-ring rounded p-0.5"
            onMouseEnter={() => setHovered(starValue)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange?.(value === starValue ? null : starValue)}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                filled ? "fill-accent text-accent" : "text-border hover:text-muted",
              )}
            />
          </button>
        );
      })}
      {value != null && <span className="ml-2 text-sm text-muted">{value}/5</span>}
    </div>
  );
}
