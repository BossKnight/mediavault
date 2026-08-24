"use client";

import { Input } from "@/components/ui/input";
import { Search } from "@/components/ui/icons";
import {
  MEDIA_TYPE_LABELS,
  WATCH_STATUS_LABELS,
  type MediaType,
  type WatchStatus,
} from "@/types/media";
import { cn } from "@/lib/utils";

const MEDIA_TYPE_FILTERS: ("ALL" | MediaType)[] = ["ALL", "MOVIE", "TV", "GAME"];
const STATUS_FILTERS: ("ALL" | WatchStatus)[] = [
  "ALL",
  "PLAN_TO_WATCH",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  mediaType: "ALL" | MediaType;
  onMediaTypeChange: (value: "ALL" | MediaType) => void;
  status: "ALL" | WatchStatus;
  onStatusChange: (value: "ALL" | WatchStatus) => void;
}

export function FilterBar({
  search,
  onSearchChange,
  mediaType,
  onMediaTypeChange,
  status,
  onStatusChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filter your catalog..."
          className="pl-9"
          aria-label="Filter your catalog"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChipGroup
          value={mediaType}
          onChange={onMediaTypeChange}
          options={MEDIA_TYPE_FILTERS}
          labelFor={(option) => (option === "ALL" ? "All types" : MEDIA_TYPE_LABELS[option])}
        />
        <span className="h-4 w-px bg-border" aria-hidden />
        <FilterChipGroup
          value={status}
          onChange={onStatusChange}
          options={STATUS_FILTERS}
          labelFor={(option) => (option === "ALL" ? "All statuses" : WATCH_STATUS_LABELS[option])}
        />
      </div>
    </div>
  );
}

interface FilterChipGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: T[];
  labelFor: (option: T) => string;
}

function FilterChipGroup<T extends string>({
  value,
  onChange,
  options,
  labelFor,
}: FilterChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={cn(
            "focus-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === option
              ? "border-accent bg-accent-muted text-accent-hover"
              : "border-border text-muted hover:text-white",
          )}
        >
          {labelFor(option)}
        </button>
      ))}
    </div>
  );
}
