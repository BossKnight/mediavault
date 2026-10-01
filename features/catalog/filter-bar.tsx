"use client";

import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "@/components/ui/icons";
import {
  CATALOG_SORT_LABELS,
  MEDIA_TYPE_LABELS,
  WATCH_STATUS_LABELS,
  getStatusLabel,
  type CatalogSort,
  type MediaType,
  type WatchStatus,
} from "@/types/media";
import { cn } from "@/lib/utils";

const MEDIA_TYPE_FILTERS: ("ALL" | MediaType)[] = ["ALL", "MOVIE", "TV", "GAME", "BOOK"];
const STATUS_FILTERS: ("ALL" | WatchStatus)[] = [
  "ALL",
  "PLAN_TO_WATCH",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];
const SORT_OPTIONS: CatalogSort[] = ["recent", "title", "rating"];

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  mediaType: "ALL" | MediaType;
  onMediaTypeChange: (value: "ALL" | MediaType) => void;
  // Omitted on the Wishlist page, where a consumption status isn't
  // meaningful yet — nothing's been started.
  status?: "ALL" | WatchStatus;
  onStatusChange?: (value: "ALL" | WatchStatus) => void;
  sort: CatalogSort;
  onSortChange: (value: CatalogSort) => void;
  // Defaults to every sort; the Wishlist page passes a narrower list.
  sortOptions?: CatalogSort[];
}

export function FilterBar({
  search,
  onSearchChange,
  mediaType,
  onMediaTypeChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  sortOptions = SORT_OPTIONS,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filter by title..."
          className="pl-9"
          aria-label="Filter by title"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChipGroup
          label="Media type"
          value={mediaType}
          onChange={onMediaTypeChange}
          options={MEDIA_TYPE_FILTERS}
          labelFor={(option) => (option === "ALL" ? "All types" : MEDIA_TYPE_LABELS[option])}
        />
        {status !== undefined && onStatusChange && (
          <>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
            <FilterChipGroup
              label="Status"
              value={status}
              onChange={onStatusChange}
              options={STATUS_FILTERS}
              labelFor={(option) => (option === "ALL" ? "All statuses" : statusFilterLabel(option))}
            />
          </>
        )}
        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span id="catalog-sort-label">Sort</span>
          {/* A native select instead of Radix here: this is the one Select
              usage that renders eagerly on every catalog/wishlist visit
              rather than inside an on-demand modal, so it's worth the
              small amount of native-picker styling it gives up. */}
          <div className="relative">
            <select
              aria-labelledby="catalog-sort-label"
              value={sort}
              onChange={(event) => onSortChange(event.target.value as CatalogSort)}
              className="focus-ring h-10 appearance-none sm:h-7 rounded-full border border-border bg-transparent py-0 pl-2.5 pr-6 text-xs font-medium text-foreground"
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>
                  {CATALOG_SORT_LABELS[option]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Books use their own wording for three statuses (see getStatusLabel), so
// the filter shows both, e.g. "In backlog / To read", to match every card.
function statusFilterLabel(status: WatchStatus): string {
  const bookLabel = getStatusLabel(status, "BOOK");
  const defaultLabel = WATCH_STATUS_LABELS[status];
  return bookLabel === defaultLabel ? defaultLabel : `${defaultLabel} / ${bookLabel}`;
}

interface FilterChipGroupProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: T[];
  labelFor: (option: T) => string;
}

function FilterChipGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  labelFor,
}: FilterChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={cn(
            "focus-ring inline-flex min-h-10 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors sm:min-h-0",
            value === option
              ? "border-accent bg-accent-muted text-accent-muted-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {labelFor(option)}
        </button>
      ))}
    </div>
  );
}
