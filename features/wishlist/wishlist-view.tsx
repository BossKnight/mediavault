"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { FilterBar } from "@/features/catalog/filter-bar";
import { CatalogItemCard } from "@/features/catalog/catalog-item-card";
import { Button } from "@/components/ui/button";
import { sortCatalogEntries } from "@/lib/catalog";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { CatalogEntry, CatalogSort, MediaType } from "@/types/media";

// Same code-splitting rationale as the catalog page: neither modal is
// needed for the initial render.
const AddItemModal = dynamic(() =>
  import("@/features/catalog/add-item-modal").then((mod) => mod.AddItemModal),
);
const ItemDetailModal = dynamic(
  () => import("@/features/catalog/item-detail-modal").then((mod) => mod.ItemDetailModal),
  { ssr: false },
);

const MEDIA_TYPES: MediaType[] = ["MOVIE", "TV", "GAME"];
// No "rating" sort here — nothing on the wishlist has been rated yet.
const SORTS: CatalogSort[] = ["recent", "title"];

function readMediaType(value: string | null): "ALL" | MediaType {
  return MEDIA_TYPES.includes(value as MediaType) ? (value as MediaType) : "ALL";
}

function readSort(value: string | null): CatalogSort {
  return SORTS.includes(value as CatalogSort) ? (value as CatalogSort) : "recent";
}

interface WishlistViewProps {
  initialEntries: CatalogEntry[];
}

/**
 * A trimmed version of CatalogView for the wishlist: same URL-synced
 * search/type/sort pattern, but no status filter or recommendations strip —
 * neither means anything before a title is owned.
 */
export function WishlistView({ initialEntries }: WishlistViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"ALL" | MediaType>(() =>
    readMediaType(searchParams.get("type")),
  );
  const [sort, setSort] = useState<CatalogSort>(() => readSort(searchParams.get("sort")));
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (mediaTypeFilter !== "ALL") params.set("type", mediaTypeFilter);
    if (sort !== "recent") params.set("sort", sort);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, mediaTypeFilter, sort, pathname, router]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (mediaTypeFilter !== "ALL" && entry.mediaItem.mediaType !== mediaTypeFilter) {
        return false;
      }
      if (query && !entry.mediaItem.title.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [entries, mediaTypeFilter, search]);

  const sortedEntries = useMemo(
    () => sortCatalogEntries(filteredEntries, sort),
    [filteredEntries, sort],
  );

  // "Add Item" can also save straight to the owned catalog — this page only
  // shows wishlist entries, so an owned save doesn't belong in this list
  // even though it succeeded.
  function handleAdded(entry: CatalogEntry) {
    if (entry.ownership !== "WISHLIST") return;
    setEntries((current) => [entry, ...current]);
  }

  // Promoting an item to owned (from the detail modal's toggle) removes it
  // from this list instead of updating it in place.
  function handleUpdated(entry: CatalogEntry) {
    setEntries((current) =>
      entry.ownership === "WISHLIST"
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
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          mediaType={mediaTypeFilter}
          onMediaTypeChange={setMediaTypeFilter}
          sort={sort}
          onSortChange={setSort}
          sortOptions={SORTS}
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
          {hasAnyEntries ? "No items match your filters" : "Your wishlist is empty"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasAnyEntries
            ? "Try clearing a filter or searching for something else."
            : "Use “Add Item” to save a movie, show, or game you want to own."}
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
