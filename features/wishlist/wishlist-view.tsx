"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { FilterBar } from "@/features/catalog/filter-bar";
import { CatalogItemCard } from "@/features/catalog/catalog-item-card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/icons";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { readMediaTypeParam, readSortParam } from "@/lib/catalog-params";
import { cn } from "@/lib/utils";
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

// No "rating" sort here — nothing on the wishlist has been rated yet.
const SORTS: CatalogSort[] = ["recent", "title"];
const PRIORITY_ROW_SIZE = 6;

interface WishlistViewProps {
  initialEntries: CatalogEntry[];
  initialNextCursor: string | null;
  initialTotal: number;
}

/**
 * A trimmed version of CatalogView for the wishlist: same URL-synced,
 * server-paginated search/type/sort pattern, but no status filter or
 * recommendations strip — neither means anything before a title is owned
 * — and no visible stats panel, though `initialTotal` still tracks the
 * true unfiltered count to tell "wishlist is empty" apart from "no results
 * under the current filter."
 */
export function WishlistView({ initialEntries, initialNextCursor, initialTotal }: WishlistViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState(initialEntries);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"ALL" | MediaType>(
    () => readMediaTypeParam(searchParams.get("type")) ?? "ALL",
  );
  const [sort, setSort] = useState<CatalogSort>(() => readSortParam(searchParams.get("sort")));
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (mediaTypeFilter !== "ALL") params.set("type", mediaTypeFilter);
    if (sort !== "recent") params.set("sort", sort);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, mediaTypeFilter, sort, pathname, router]);

  function buildFetchParams(cursor?: string) {
    const params = new URLSearchParams({ ownership: "WISHLIST", sort });
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (mediaTypeFilter !== "ALL") params.set("mediaType", mediaTypeFilter);
    if (cursor) params.set("cursor", cursor);
    return params;
  }

  async function fetchPage(cursor: string | undefined, signal?: AbortSignal) {
    const response = await fetch(`/api/catalog?${buildFetchParams(cursor)}`, { signal });
    if (!response.ok) throw new Error("Failed to load wishlist");
    return (await response.json()) as { entries: CatalogEntry[]; nextCursor: string | null };
  }

  async function refetchTotal() {
    try {
      const response = await fetch("/api/catalog/stats?ownership=WISHLIST");
      if (!response.ok) return;
      const data = (await response.json()) as { stats: { total: number } };
      setTotal(data.stats.total);
    } catch {
      // The count is a secondary signal (only used to pick an empty-state
      // message) — a failed refresh isn't worth surfacing as an error.
    }
  }

  async function refetchCurrentPage() {
    setLoadingPage(true);
    setLoadError(null);
    try {
      const { entries: fetched, nextCursor: cursor } = await fetchPage(undefined);
      setEntries(fetched);
      setNextCursor(cursor);
    } catch {
      setLoadError("Couldn't refresh your wishlist. Try again.");
    } finally {
      setLoadingPage(false);
    }
  }

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const controller = new AbortController();
    setLoadingPage(true);
    setLoadError(null);

    fetchPage(undefined, controller.signal)
      .then(({ entries: fetched, nextCursor: cursor }) => {
        setEntries(fetched);
        setNextCursor(cursor);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError("Couldn't load your wishlist. Try again.");
      })
      .finally(() => setLoadingPage(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, mediaTypeFilter, sort]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const { entries: fetched, nextCursor: cursor } = await fetchPage(nextCursor);
      setEntries((current) => [...current, ...fetched]);
      setNextCursor(cursor);
    } catch {
      setLoadError("Couldn't load more items. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  // "Add Item" can also save straight to the owned catalog — this page
  // only shows wishlist entries, so an owned save doesn't touch this list
  // or count.
  function handleAdded(entry: CatalogEntry) {
    if (entry.ownership !== "WISHLIST") return;
    void refetchCurrentPage();
    void refetchTotal();
  }

  function handleUpdated() {
    void refetchCurrentPage();
    void refetchTotal();
  }

  function handleDeleted() {
    void refetchCurrentPage();
    void refetchTotal();
  }

  function handleClearFilters() {
    setSearch("");
    setMediaTypeFilter("ALL");
  }

  const hasAnyItems = total > 0;

  return (
    <div className="flex flex-col gap-8">
      {hasAnyItems && (
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
      )}

      {hasAnyItems && loadingPage && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader className="h-3.5 w-3.5" />
          Updating...
        </div>
      )}

      {hasAnyItems && loadError && (
        <div className="flex items-center justify-between gap-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <span>{loadError}</span>
          <Button variant="secondary" size="sm" onClick={refetchCurrentPage}>
            Retry
          </Button>
        </div>
      )}

      {!hasAnyItems ? (
        <EmptyState hasAnyEntries={false} onClearFilters={handleClearFilters} onAdded={handleAdded} />
      ) : entries.length === 0 && !loadingPage ? (
        <EmptyState hasAnyEntries onClearFilters={handleClearFilters} onAdded={handleAdded} />
      ) : (
        <div
          className={cn(
            "grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
            loadingPage && "pointer-events-none opacity-50",
          )}
        >
          {entries.map((entry, index) => (
            <CatalogItemCard
              key={entry.id}
              entry={entry}
              onSelect={setSelectedEntry}
              priority={index < PRIORITY_ROW_SIZE}
            />
          ))}
        </div>
      )}

      {hasAnyItems && nextCursor && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      <ItemDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdated={(entry) => {
          handleUpdated();
          setSelectedEntry(entry.ownership === "WISHLIST" ? entry : null);
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

interface EmptyStateProps {
  hasAnyEntries: boolean;
  onClearFilters: () => void;
  onAdded: (entry: CatalogEntry) => void;
}

function EmptyState({ hasAnyEntries, onClearFilters, onAdded }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border py-16 text-center">
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-foreground">
          {hasAnyEntries ? "No items match your filters" : "Your wishlist is empty"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasAnyEntries
            ? "Try clearing a filter or searching for something else."
            : "Use “Add Item” to save a movie, show, game, or book you want to own."}
        </p>
      </div>
      {hasAnyEntries ? (
        <Button variant="secondary" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      ) : (
        <AddItemModal onAdded={onAdded} />
      )}
    </div>
  );
}
