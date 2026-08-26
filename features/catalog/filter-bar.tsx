"use client";

import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "@/components/ui/icons";
import {
  CATALOG_SORT_LABELS,
  MEDIA_TYPE_LABELS,
  WATCH_STATUS_LABELS,
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
  // Wishlist also drops "rating" as a sort option, since nothing has one.
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
        {status !== undefined && onStatusChange && (
          <>
            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
            <FilterChipGroup
              value={status}
              onChange={onStatusChange}
              options={STATUS_FILTERS}
              labelFor={(option) => (option === "ALL" ? "All statuses" : WATCH_STATUS_LABELS[option])}
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
              className="focus-ring h-7 appearance-none rounded-full border border-border bg-transparent py-0 pl-2.5 pr-6 text-xs font-medium text-foreground"
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
