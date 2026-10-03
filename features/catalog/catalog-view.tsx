"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FilterBar } from "@/features/catalog/filter-bar";
import { CatalogItemCard } from "@/features/catalog/catalog-item-card";
import { CatalogList } from "@/features/catalog/catalog-list";
import { ViewToggle } from "@/features/catalog/view-toggle";
import { StatsPanel } from "@/features/catalog/stats-panel";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/icons";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  readMediaTypeParam,
  readSortParam,
  readStatusParam,
} from "@/lib/catalog-params";
import { useLayoutPreference } from "@/lib/layout-preference";
import { cn } from "@/lib/utils";
import type {
  CatalogEntry,
  CatalogSort,
  CatalogStats,
  CatalogLayout,
  MediaType,
  WatchStatus,
} from "@/types/media";

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

// One row at the widest grid breakpoint (6 columns); see CatalogItemCard's
// `priority` prop.
const PRIORITY_ROW_SIZE = 6;

interface CatalogViewProps {
  initialEntries: CatalogEntry[];
  initialNextCursor: string | null;
  initialStats: CatalogStats;
  initialLayout: CatalogLayout;
}

export function CatalogView({
  initialEntries,
  initialNextCursor,
  initialStats,
  initialLayout,
}: CatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState(initialEntries);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"ALL" | MediaType>(
    () => readMediaTypeParam(searchParams.get("type")) ?? "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<"ALL" | WatchStatus>(
    () => readStatusParam(searchParams.get("status")) ?? "ALL",
  );
  const [sort, setSort] = useState<CatalogSort>(() => readSortParam(searchParams.get("sort")));
  const [layout, setLayout] = useLayoutPreference(initialLayout);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // Confirms a save that landed on the other list, which this page doesn't
  // show, so the save would otherwise look like it did nothing.
  const [notice, setNotice] = useState<string | null>(null);

  // Debounced so neither the URL nor the server fetch churns on every
  // keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (mediaTypeFilter !== "ALL") params.set("type", mediaTypeFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (sort !== "recent") params.set("sort", sort);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, mediaTypeFilter, statusFilter, sort, pathname, router]);

  function buildFetchParams(cursor?: string) {
    const params = new URLSearchParams({ ownership: "OWNED", sort });
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (mediaTypeFilter !== "ALL") params.set("mediaType", mediaTypeFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (cursor) params.set("cursor", cursor);
    return params;
  }

  async function fetchPage(cursor: string | undefined, signal?: AbortSignal) {
    const response = await fetch(`/api/catalog?${buildFetchParams(cursor)}`, { signal });
    if (!response.ok) throw new Error("Failed to load vault");
    return (await response.json()) as { entries: CatalogEntry[]; nextCursor: string | null };
  }

  async function refetchStats() {
    try {
      const response = await fetch("/api/catalog/stats?ownership=OWNED");
      if (!response.ok) return;
      const data = (await response.json()) as { stats: CatalogStats };
      setStats(data.stats);
    } catch {
      // Stats are a secondary display — a failed refresh just leaves the
      // counts one action stale rather than surfacing an error of its own.
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
      setLoadError("Couldn't refresh your vault. Try again.");
    } finally {
      setLoadingPage(false);
    }
  }

  // Filtering and sorting run on the server (see lib/catalog-query.ts), so
  // every change here re-fetches page one. The very first run is skipped:
  // the server component already fetched the matching first page for
  // whatever the URL asked for.
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
        setLoadError("Couldn't load your vault. Try again.");
      })
      .finally(() => setLoadingPage(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, mediaTypeFilter, statusFilter, sort]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const { entries: fetched, nextCursor: cursor } = await fetchPage(nextCursor);
      setEntries((current) => [...current, ...fetched]);
      setNextCursor(cursor);
    } catch {
      setLoadMoreError("Couldn't load more items.");
    } finally {
      setLoadingMore(false);
    }
  }

  // "Add Item" can also save straight to the wishlist (a secondary action
  // in the same modal) — this page only shows owned entries, so a wishlist
  // save doesn't touch this list or these stats. A matching owned save
  // refreshes both rather than guessing whether it belongs under the
  // active filters.
  function handleAdded(entry: CatalogEntry) {
    if (entry.ownership !== "OWNED") {
      setNotice(`Added “${entry.mediaItem.title}” to your wishlist.`);
      return;
    }
    setNotice(null);
    void refetchCurrentPage();
    void refetchStats();
  }

  function handleUpdated() {
    void refetchCurrentPage();
    void refetchStats();
  }

  function handleDeleted() {
    void refetchCurrentPage();
    void refetchStats();
  }

  function handleClearFilters() {
    setSearch("");
    setMediaTypeFilter("ALL");
    setStatusFilter("ALL");
  }

  // True totals (from the stats query, not this page's `entries`) decide
  // whether the collection is genuinely empty — so a first-time visit
  // shows just the empty-state message and "+ Add Item," not a full row
  // of zeroed stat tiles and filters for content that doesn't exist yet.
  const hasAnyItems = stats.total > 0;

  return (
    <div className="flex flex-col gap-8">
      {hasAnyItems ? (
        <>
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
            <div className="flex items-center gap-2">
              <ViewToggle value={layout} onChange={setLayout} />
              <AddItemModal onAdded={handleAdded} />
            </div>
          </div>

          {/* Always mounted so screen readers announce changes; sr-only keeps
              it out of the layout. */}
          <p role="status" className="sr-only">
            {loadingPage ? "Updating results..." : (notice ?? "")}
          </p>

          {notice && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent/40 bg-accent-muted px-4 py-3 text-sm text-accent-muted-foreground">
              <span>
                {notice}{" "}
                <Link href="/wishlist" className="focus-ring rounded font-medium underline underline-offset-2">
                  View wishlist
                </Link>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {loadingPage && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader className="h-3.5 w-3.5" />
              Updating...
            </div>
          )}

          {loadError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              <span>{loadError}</span>
              <Button variant="secondary" size="sm" onClick={refetchCurrentPage}>
                Retry
              </Button>
            </div>
          )}

          {entries.length === 0 && !loadingPage ? (
            <EmptyState hasAnyEntries onClearFilters={handleClearFilters} onAdded={handleAdded} />
          ) : (
            <div
              // inert also blocks keyboard focus on items that are about to be
              // replaced, which pointer-events-none alone doesn't.
              inert={loadingPage || undefined}
              aria-busy={loadingPage}
              className={cn(
                "transition-opacity",
                layout === "grid" && "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
                (loadingPage || loadError) && "opacity-50",
              )}
            >
              {layout === "list" ? (
                <CatalogList entries={entries} onSelect={setSelectedEntry} />
              ) : (
                entries.map((entry, index) => (
                  <CatalogItemCard
                    key={entry.id}
                    entry={entry}
                    onSelect={setSelectedEntry}
                    priority={index < PRIORITY_ROW_SIZE}
                  />
                ))
              )}
            </div>
          )}

          {nextCursor && (
            <div className="flex flex-col items-center gap-2">
              {loadMoreError && (
                <p role="alert" className="text-sm text-danger">
                  {loadMoreError}
                </p>
              )}
              <Button variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : loadMoreError ? "Try again" : "Load more"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState hasAnyEntries={false} onClearFilters={handleClearFilters} onAdded={handleAdded} />
      )}

      <ItemDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdated={(entry) => {
          handleUpdated();
          if (entry.ownership !== "OWNED") {
            setNotice(`Moved “${entry.mediaItem.title}” to your wishlist.`);
          }
          setSelectedEntry(entry.ownership === "OWNED" ? entry : null);
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
          {hasAnyEntries ? "No items match your filters" : "Your vault is empty"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasAnyEntries
            ? "Try clearing a filter or searching for something else."
            : "Use “Add item” to search for a movie, show, game, or book to add to your vault."}
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
