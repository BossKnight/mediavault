"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { FilterBar } from "@/features/catalog/filter-bar";
import { CatalogItemCard } from "@/features/catalog/catalog-item-card";
import { StatsPanel } from "@/features/catalog/stats-panel";
import { Button } from "@/components/ui/button";
import { computeStats, sortCatalogEntries } from "@/lib/catalog";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { CatalogEntry, CatalogSort, MediaType, WatchStatus } from "@/types/media";

// Code-split the two modals out of the catalog page's main bundle: neither
// is needed for the initial render (Add Item's dialog content and Item
// Detail's entire tree are both closed by default), but each pulls in
// Radix Dialog/Select. Add Item keeps SSR on since its trigger button is
// visible immediately; Item Detail always renders null until a card is
// clicked, so it never needs to be part of the server-rendered HTML at all.
const AddItemModal = dynamic(() =>
  import("@/features/catalog/add-item-modal").then((mod) => mod.AddItemModal),
);
const ItemDetailModal = dynamic(
  () => import("@/features/catalog/item-detail-modal").then((mod) => mod.ItemDetailModal),
  { ssr: false },
);

const MEDIA_TYPES: MediaType[] = ["MOVIE", "TV", "GAME", "BOOK"];
const WATCH_STATUSES: WatchStatus[] = [
  "PLAN_TO_WATCH",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];
const SORTS: CatalogSort[] = ["recent", "title", "rating"];

function readMediaType(value: string | null): "ALL" | MediaType {
  return MEDIA_TYPES.includes(value as MediaType) ? (value as MediaType) : "ALL";
}

function readStatus(value: string | null): "ALL" | WatchStatus {
  return WATCH_STATUSES.includes(value as WatchStatus) ? (value as WatchStatus) : "ALL";
}

function readSort(value: string | null): CatalogSort {
  return SORTS.includes(value as CatalogSort) ? (value as CatalogSort) : "recent";
}

interface CatalogViewProps {
  initialEntries: CatalogEntry[];
}

export function CatalogView({ initialEntries }: CatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"ALL" | MediaType>(() =>
    readMediaType(searchParams.get("type")),
  );
  const [statusFilter, setStatusFilter] = useState<"ALL" | WatchStatus>(() =>
    readStatus(searchParams.get("status")),
  );
  const [sort, setSort] = useState<CatalogSort>(() => readSort(searchParams.get("sort")));
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);

  // Debounce only the URL write, not the filtering itself, so results stay
  // instant while typing but a shared/refreshed link doesn't churn on every
  // keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (mediaTypeFilter !== "ALL") params.set("type", mediaTypeFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (sort !== "recent") params.set("sort", sort);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, mediaTypeFilter, statusFilter, sort, pathname, router]);

  const stats = useMemo(() => computeStats(entries), [entries]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (mediaTypeFilter !== "ALL" && entry.mediaItem.mediaType !== mediaTypeFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && entry.status !== statusFilter) {
        return false;
      }
      if (query && !entry.mediaItem.title.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [entries, mediaTypeFilter, statusFilter, search]);

  const sortedEntries = useMemo(
    () => sortCatalogEntries(filteredEntries, sort),
    [filteredEntries, sort],
  );

  // "Add Item" can also save straight to the wishlist (a secondary action in
  // the same modal) — this page only shows owned entries, so a wishlist save
  // doesn't belong in this list even though it succeeded.
  function handleAdded(entry: CatalogEntry) {
    if (entry.ownership !== "OWNED") return;
    setEntries((current) => [entry, ...current]);
  }

  // An entry can also leave ownership here (demoted to wishlist from the
  // detail modal's toggle), in which case it drops out of this list instead
  // of updating in place.
  function handleUpdated(entry: CatalogEntry) {
    setEntries((current) =>
      entry.ownership === "OWNED"
        ? current.map((existing) => (existing.id === entry.id ? entry : existing))
        : current.filter((existing) => existing.id !== entry.id),
    );
  }

  function handleDeleted(id: string) {
    setEntries((current) => current.filter((existing) => existing.id !== id));
  }

  function handleClearFilters() {
    setSearch("");
    setMediaTypeFilter("ALL");
    setStatusFilter("ALL");
  }

  return (
    <div className="flex flex-col gap-8">
      <StatsPanel
        stats={stats}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        entries={entries}
        onSelectRecommendation={setSelectedEntry}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          mediaType={mediaTypeFilter}
          onMediaTypeChange={setMediaTypeFilter}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          sort={sort}
          onSortChange={setSort}
        />
        <AddItemModal onAdded={handleAdded} />
      </div>

      {sortedEntries.length === 0 ? (
        <EmptyState hasAnyEntries={entries.length > 0} onClearFilters={handleClearFilters} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {sortedEntries.map((entry) => (
            <CatalogItemCard key={entry.id} entry={entry} onSelect={setSelectedEntry} />
          ))}
        </div>
      )}

      <ItemDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdated={(entry) => {
          handleUpdated(entry);
          setSelectedEntry(entry);
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

interface EmptyStateProps {
  hasAnyEntries: boolean;
  onClearFilters: () => void;
}

function EmptyState({ hasAnyEntries, onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border py-16 text-center">
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-foreground">
          {hasAnyEntries ? "No items match your filters" : "Your catalog is empty"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasAnyEntries
            ? "Try clearing a filter or searching for something else."
            : "Use “Add Item” to search for a movie, show, game, or book to catalog."}
        </p>
      </div>
      {hasAnyEntries && (
        <Button variant="secondary" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
