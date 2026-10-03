"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlatformField } from "@/features/catalog/platform-field";
import { Camera, Loader, Search } from "@/components/ui/icons";
import { BarcodeScannerPanel } from "@/features/catalog/barcode-scanner-panel";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  MEDIA_TYPE_LABELS,
  type CatalogEntry,
  type MediaType,
  type OwnershipStatus,
  type UnifiedSearchResult,
} from "@/types/media";

const MEDIA_TYPES: MediaType[] = ["MOVIE", "TV", "GAME", "BOOK"];
const SAVE_LABELS: Record<OwnershipStatus, string> = {
  OWNED: "Add to vault",
  WISHLIST: "Add to wishlist",
};
type Step = "search" | "scan" | "confirm";

interface AddItemModalProps {
  onAdded: (entry: CatalogEntry) => void;
  // Which list the primary button saves to: the list the user is looking at.
  // The other list is still offered as the secondary action.
  primaryOwnership?: OwnershipStatus;
}

/**
 * The full "Add Item" discovery flow, as three steps of one dialog: search
 * (with a "Scan barcode" entry point), scan, and confirm. Keeping the scan
 * step inside the same Dialog instance — rather than opening a second,
 * nested one — avoids stacking two Radix dialog overlays on top of each
 * other. New items default to "In backlog" (or "To read" for books) — the
 * initial status isn't asked here.
 */
export function AddItemModal({ onAdded, primaryOwnership = "OWNED" }: AddItemModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("search");
  const [mediaType, setMediaType] = useState<MediaType>("MOVIE");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [settledSearchKey, setSettledSearchKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<UnifiedSearchResult | null>(null);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [savingAction, setSavingAction] = useState<OwnershipStatus | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const secondaryOwnership: OwnershipStatus = primaryOwnership === "OWNED" ? "WISHLIST" : "OWNED";
  const trimmedQuery = debouncedQuery.trim();
  // Identifies the search the current inputs call for. A search is in flight
  // until a response for this exact key has settled.
  const searchKey = `${mediaType}:${retryToken}:${trimmedQuery}`;
  const searching = Boolean(trimmedQuery) && settledSearchKey !== searchKey;

  useEffect(() => {
    if (!trimmedQuery) return;

    const controller = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&type=${mediaType.toLowerCase()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as { results: UnifiedSearchResult[] };
        setResults(data.results);
        setSearchError(null);
        setSettledSearchKey(searchKey);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchError("Couldn't load results. Try again.");
        setResults([]);
        setSettledSearchKey(searchKey);
      });

    return () => controller.abort();
    // searchKey includes retryToken, which has no value of its own; bumping it
    // re-runs this effect to replay the same search after a failure or reset.
  }, [trimmedQuery, mediaType, searchKey]);

  // Once the query is cleared, stop showing results from the previous query
  // rather than clearing `results` itself in an effect.
  const visibleResults = trimmedQuery ? results : [];

  // Read by a persistent live region, since one that mounts together with
  // its message isn't reliably announced. Errors use role="alert" instead.
  let searchStatusMessage = "";
  if (searching) {
    searchStatusMessage = "Searching...";
  } else if (trimmedQuery && !searchError) {
    searchStatusMessage =
      visibleResults.length === 1 ? "1 result" : `${visibleResults.length} results`;
  }

  function reset() {
    setStep("search");
    setQuery("");
    setResults([]);
    // Forces a fresh search key, so reopening with the same query refetches
    // instead of matching the previous session's settled search.
    setRetryToken((token) => token + 1);
    setSelected(null);
    setSaveError(null);
    setPlatforms([]);
  }

  function handleRetry() {
    setRetryToken((token) => token + 1);
  }

  function handleSelectResult(result: UnifiedSearchResult) {
    setSelected(result);
    setStep("confirm");
  }

  // A resolved barcode is treated as an unambiguous pick: it jumps straight
  // to the confirm step instead of dropping the user into a results list,
  // matching the "scan it and it's in your collection" point of scanning in
  // the first place. If the code turned out to be a book's ISBN, the media
  // type tab switches to match even if a different tab was active.
  function handleBarcodeResults(results: UnifiedSearchResult[]) {
    const [first] = results;
    if (!first) return;
    if (first.mediaType !== mediaType) {
      setMediaType(first.mediaType);
    }
    setSelected(first);
    setStep("confirm");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleSave(ownership: OwnershipStatus) {
    if (!selected) return;
    setSavingAction(ownership);
    setSaveError(null);

    try {
      const response = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selected,
          ownership,
          // A wishlist item has no physical copy yet, so there's no format
          // or platform to record — whatever's in the field is ignored.
          platforms: ownership === "OWNED" ? platforms : [],
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSaveError(data.error ?? "Couldn't save this item.");
        return;
      }

      onAdded(data.entry as CatalogEntry);
      handleOpenChange(false);
    } catch {
      setSaveError("Couldn't save this item. Check your connection and try again.");
    } finally {
      setSavingAction(null);
    }
  }

  const titleByStep: Record<Step, string> = {
    search: "Add an item",
    scan: "Scan a barcode",
    confirm: "Add an item",
  };
  const descriptionByStep: Record<Step, string | undefined> = {
    search: "Search for a movie, TV show, game, or book.",
    scan: "Scan a book's ISBN, or a movie, show, or game's barcode.",
    confirm: undefined,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="shrink-0 whitespace-nowrap">+ Add item</Button>
      </DialogTrigger>
      <DialogContent title={titleByStep[step]} description={descriptionByStep[step]}>
        {step === "search" && (
          <div className="flex flex-col gap-4">
            <div
              role="group"
              aria-label="Media type"
              className="flex gap-1 rounded-lg border border-border bg-surface p-1"
            >
              {MEDIA_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={mediaType === type}
                  onClick={() => setMediaType(type)}
                  className={`focus-ring flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                    mediaType === type
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-surface-foreground"
                  }`}
                >
                  {MEDIA_TYPE_LABELS[type]}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search for a ${MEDIA_TYPE_LABELS[mediaType].toLowerCase()}...`}
                className="pl-9"
                aria-label="Search"
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep("scan")}
              className="justify-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Scan barcode
            </Button>

            <p role="status" className="sr-only">
              {searchStatusMessage}
            </p>

            <div className="max-h-80 min-h-24 overflow-y-auto rounded-lg">
              {searching && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader className="h-4 w-4" />
                  Searching...
                </div>
              )}

              {!searching && trimmedQuery && searchError && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <p role="alert" className="text-sm text-danger">
                    {searchError}
                  </p>
                  <Button variant="secondary" size="sm" onClick={handleRetry}>
                    Try again
                  </Button>
                </div>
              )}

              {!searching && !searchError && trimmedQuery && visibleResults.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{trimmedQuery}&rdquo;.
                </p>
              )}

              {!searching && !trimmedQuery && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Start typing to search {MEDIA_TYPE_LABELS[mediaType].toLowerCase()}s.
                </p>
              )}

              <ul className="flex flex-col gap-1">
                {visibleResults.map((result) => (
                  <li key={`${result.source}-${result.externalId}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="focus-ring flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-raised"
                    >
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-surface-raised">
                        {result.coverUrl && (
                          <Image
                            src={result.coverUrl}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-surface-foreground">{result.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.releaseDate?.slice(0, 4) ?? "Unknown year"}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {step === "scan" && (
          <BarcodeScannerPanel
            mediaType={mediaType}
            onResults={handleBarcodeResults}
            onBack={() => setStep("search")}
          />
        )}

        {step === "confirm" && selected && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="relative h-32 w-[88px] shrink-0 overflow-hidden rounded-lg bg-surface-raised">
                {selected.coverUrl && (
                  <Image
                    src={selected.coverUrl}
                    alt=""
                    fill
                    sizes="88px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-surface-foreground">{selected.title}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.releaseDate?.slice(0, 4) ?? "Unknown year"}
                  {selected.creator ? ` · ${selected.creator}` : ""}
                </p>
                {selected.genres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.genres.slice(0, 4).map((genre) => (
                      <Badge key={genre}>{genre}</Badge>
                    ))}
                  </div>
                )}
                {selected.overview && (
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{selected.overview}</p>
                )}
              </div>
            </div>

            <PlatformField
              key={`${selected.source}:${selected.externalId}`}
              mediaType={selected.mediaType}
              value={platforms}
              onChange={setPlatforms}
            />

            {saveError && (
              <p role="alert" className="text-sm text-danger">
                {saveError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(null);
                  setStep("search");
                }}
                disabled={savingAction !== null}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSave(secondaryOwnership)}
                disabled={savingAction !== null}
                className="w-full sm:w-auto"
              >
                {savingAction === secondaryOwnership ? "Saving..." : SAVE_LABELS[secondaryOwnership]}
              </Button>
              <Button
                onClick={() => handleSave(primaryOwnership)}
                disabled={savingAction !== null}
                className="w-full sm:w-auto"
              >
                {savingAction === primaryOwnership ? "Saving..." : SAVE_LABELS[primaryOwnership]}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
