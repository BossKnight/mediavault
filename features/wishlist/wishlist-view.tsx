"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/features/catalog/filter-bar";
import { CatalogItemCard } from "@/features/catalog/catalog-item-card";
import { CatalogList } from "@/features/catalog/catalog-list";
import { ViewToggle } from "@/features/catalog/view-toggle";
import {
  AddItemButton,
  ItemDetailModal,
  preloadItemDetailModal,
} from "@/features/catalog/lazy-modals";
import { ListNoticeBar } from "@/features/catalog/list-notice";
import {
  highlightedEntryIds,
  listNoticeMessage,
  withAddedEntry,
  type ListNotice,
} from "@/lib/added-notice";
import { useLayoutPreference } from "@/lib/layout-preference";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/icons";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { readMediaTypeParam, readSortParam } from "@/lib/catalog-params";
import { cn } from "@/lib/utils";
import type { CatalogEntry, CatalogLayout, CatalogSort, MediaType } from "@/types/media";

// No "rating" sort here — nothing on the wishlist has been rated yet.
const SORTS: CatalogSort[] = ["recent", "title"];
const PRIORITY_ROW_SIZE = 6;

interface WishlistViewProps {
  initialEntries: CatalogEntry[];
  initialNextCursor: string | null;
  initialTotal: number;
  initialLayout: CatalogLayout;
}

/**
 * A trimmed version of CatalogView for the wishlist: same URL-synced,
 * server-paginated search/type/sort pattern, but no status filter or
 * recommendations strip — neither means anything before a title is owned
 * — and no visible stats panel, though `initialTotal` still tracks the
 * true unfiltered count to tell "wishlist is empty" apart from "no results
 * under the current filter."
 */
export function WishlistView({
  initialEntries,
  initialNextCursor,
  initialTotal,
  initialLayout,
}: WishlistViewProps) {
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
  const [layout, setLayout] = useLayoutPreference(initialLayout);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // Confirms adds (to either list) and moves between lists; the page's own
  // new entries are highlighted while it shows.
  const [notice, setNotice] = useState<ListNotice | null>(null);
  const highlighted = highlightedEntryIds(notice, "WISHLIST");

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

  // "Add item" can also save straight to the vault, and this page
  // only shows wishlist entries, so an owned save doesn't touch this list
  // or count.
  function handleAdded(entry: CatalogEntry) {
    setNotice((current) => withAddedEntry(current, entry));
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
    <div
      className="flex flex-col gap-8"
      onPointerEnter={preloadItemDetailModal}
      onFocus={preloadItemDetailModal}
    >
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
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:has-[[data-add-draft]]:flex-wrap lg:has-[[data-add-draft]]:flex-nowrap">
            <ViewToggle value={layout} onChange={setLayout} />
            <AddItemButton
              onAdded={handleAdded}
              onOpenExisting={setSelectedEntry}
              primaryOwnership="WISHLIST"
            />
          </div>
        </div>
      )}

      {/* Always mounted so screen readers announce changes; sr-only keeps
          it out of the layout. */}
      <p role="status" className="sr-only">
        {hasAnyItems && loadingPage
          ? "Updating results..."
          : notice
            ? listNoticeMessage(notice)
            : ""}
      </p>

      {notice && (
        <ListNoticeBar
          notice={notice}
          list="WISHLIST"
          filters={{ q: debouncedSearch, mediaType: mediaTypeFilter }}
          onDismiss={() => setNotice(null)}
          onClearFilters={handleClearFilters}
        />
      )}

      {hasAnyItems && loadingPage && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader className="h-3.5 w-3.5" />
          Updating...
        </div>
      )}

      {hasAnyItems && loadError && (
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

      {!hasAnyItems ? (
        <EmptyState
          hasAnyEntries={false}
          onClearFilters={handleClearFilters}
          onAdded={handleAdded}
          onOpenExisting={setSelectedEntry}
        />
      ) : entries.length === 0 && !loadingPage ? (
        <EmptyState
          hasAnyEntries
          onClearFilters={handleClearFilters}
          onAdded={handleAdded}
          onOpenExisting={setSelectedEntry}
        />
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
            <CatalogList
              entries={entries}
              onSelect={setSelectedEntry}
              highlightedIds={highlighted}
              variant="wishlist"
            />
          ) : (
            entries.map((entry, index) => (
              <CatalogItemCard
                key={entry.id}
                entry={entry}
                onSelect={setSelectedEntry}
                priority={index < PRIORITY_ROW_SIZE}
                highlighted={highlighted.has(entry.id)}
              />
            ))
          )}
        </div>
      )}

      {hasAnyItems && nextCursor && (
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

      <ItemDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdated={(entry) => {
          handleUpdated();
          // Compare with where the entry was: "Open it" (adding a title
          // that's already saved) can open an entry from the other list.
          const wasHere = selectedEntry?.ownership === "WISHLIST";
          const isHere = entry.ownership === "WISHLIST";
          if (wasHere !== isHere) {
            setNotice({
              kind: "moved",
              message: `Moved “${entry.mediaItem.title}” to your ${isHere ? "wishlist" : "vault"}.`,
              elsewhere: !isHere,
            });
          }
          setSelectedEntry(wasHere && !isHere ? null : entry);
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
  onOpenExisting: (entry: CatalogEntry) => void;
}

function EmptyState({ hasAnyEntries, onClearFilters, onAdded, onOpenExisting }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border py-16 text-center">
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-foreground">
          {hasAnyEntries ? "No items match your filters" : "Your wishlist is empty"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasAnyEntries
            ? "Try clearing a filter or searching for something else."
            : "Use “Add item” to save a movie, show, game, or book you want to own."}
        </p>
      </div>
      {hasAnyEntries ? (
        <Button variant="secondary" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      ) : (
        <AddItemButton
          onAdded={onAdded}
          onOpenExisting={onOpenExisting}
          primaryOwnership="WISHLIST"
        />
      )}
    </div>
  );
}
