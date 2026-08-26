"use client";

import { Input } from "@/components/ui/input";
import { Search } from "@/components/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATALOG_SORT_LABELS,
  MEDIA_TYPE_LABELS,
  WATCH_STATUS_LABELS,
  type CatalogSort,
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
            <span className="h-4 w-px bg-border" aria-hidden />
            <FilterChipGroup
              value={status}
              onChange={onStatusChange}
              options={STATUS_FILTERS}
              labelFor={(option) => (option === "ALL" ? "All statuses" : WATCH_STATUS_LABELS[option])}
            />
          </>
        )}
        <span className="h-4 w-px bg-border" aria-hidden />
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span id="catalog-sort-label">Sort</span>
          <Select value={sort} onValueChange={(value) => onSortChange(value as CatalogSort)}>
            <SelectTrigger
              aria-labelledby="catalog-sort-label"
              className="h-7 w-auto gap-1 rounded-full border-border bg-transparent px-2.5 py-0 text-xs font-medium text-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {CATALOG_SORT_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
