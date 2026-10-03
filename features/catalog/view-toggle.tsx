"use client";

import { Grid, List } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { CatalogLayout } from "@/types/media";

const OPTIONS: { value: CatalogLayout; label: string; Icon: typeof Grid }[] = [
  { value: "grid", label: "Thumbnails", Icon: Grid },
  { value: "list", label: "List", Icon: List },
];

interface ViewToggleProps {
  value: CatalogLayout;
  onChange: (value: CatalogLayout) => void;
}

/** Switches the vault between cover thumbnails and a text list. */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div role="group" aria-label="Display" className="flex gap-1 rounded-lg border border-border bg-surface p-1">
      {OPTIONS.map(({ value: option, label, Icon }) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={cn(
            "focus-ring flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
            value === option
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-surface-foreground",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
