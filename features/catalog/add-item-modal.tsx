"use client";

import { type RefObject, useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ErrorMessage } from "@/components/ui/error-message";
import { PlatformField } from "@/features/catalog/platform-field";
import { Camera, Check, Loader, Search } from "@/components/ui/icons";
import { BarcodeScannerPanel } from "@/features/catalog/barcode-scanner-panel";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { SESSION_EXPIRED_MESSAGE, apiErrorMessage } from "@/lib/session-expired";
import { LIST_NAMES } from "@/lib/added-notice";
import {
  MEDIA_TYPE_LABELS,
  getStatusLabel,
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
type Step = "search" | "scan" | "confirm" | "added";

interface AddItemModalProps {
  // Controlled by AddItemButton (features/catalog/lazy-modals.tsx), which
  // renders the trigger so it doesn't wait on this module to load.
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where focus goes when the dialog closes: the trigger, as Radix's own
  // DialogTrigger would do.
  returnFocusTo: RefObject<HTMLElement | null>;
  onAdded: (entry: CatalogEntry) => void;
  // Opens an entry the user already has, offered when they try to add it
  // again. Without it, that error has no "Open it" button.
  onOpenExisting?: (entry: CatalogEntry) => void;
  // Which list the primary button saves to: the list the user is looking at.
  // The other list is still offered as the secondary action.
  primaryOwnership?: OwnershipStatus;
}

/**
 * The full "Add Item" discovery flow, as steps of one dialog: search (with a
 * "Scan barcode" entry point), scan, confirm, and a confirmation that offers
 * "Add another", so adding several items doesn't mean reopening the dialog. Keeping the scan
 * step inside the same Dialog instance — rather than opening a second,
 * nested one — avoids stacking two Radix dialog overlays on top of each
 * other. New items default to "In backlog" (or "To read" for books) — the
 * initial status isn't asked here.
 */
export function AddItemModal({
  open,
  onOpenChange,
  returnFocusTo,
  onAdded,
  onOpenExisting,
  primaryOwnership = "OWNED",
}: AddItemModalProps) {
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
  // The user's existing entry for the selected title, when saving found one.
  const [existingEntry, setExistingEntry] = useState<CatalogEntry | null>(null);
  // The entry just saved, shown on the confirmation step.
  const [added, setAdded] = useState<CatalogEntry | null>(null);
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
        if (!response.ok) {
          throw new Error(
            response.status === 401 ? SESSION_EXPIRED_MESSAGE : "Couldn't load results. Try again.",
          );
        }
        const data = (await response.json()) as { results: UnifiedSearchResult[] };
        setResults(data.results);
        setSearchError(null);
        setSettledSearchKey(searchKey);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchError(
          error instanceof Error && error.message === SESSION_EXPIRED_MESSAGE
            ? SESSION_EXPIRED_MESSAGE
            : "Couldn't load results. Try again.",
        );
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
    setExistingEntry(null);
    setAdded(null);
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
    onOpenChange(next);
    if (!next) reset();
  }

  async function handleSave(ownership: OwnershipStatus) {
    if (!selected) return;
    setSavingAction(ownership);
    setSaveError(null);
    setExistingEntry(null);

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
        setSaveError(apiErrorMessage(response, data, "Couldn't save this item."));
        if (response.status === 409 && data.entry) setExistingEntry(data.entry as CatalogEntry);
        return;
      }

      onAdded(data.entry as CatalogEntry);
      setAdded(data.entry as CatalogEntry);
      setStep("added");
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
    added: "Add an item",
  };
  const descriptionByStep: Record<Step, string | undefined> = {
    search: "Search for a movie, TV show, game, or book.",
    scan: "Scan a book's ISBN, or a movie, show, or game's barcode.",
    confirm: undefined,
    added: undefined,
  };

  const addedMessage = added
    ? `Added “${added.mediaItem.title}” to your ${LIST_NAMES[added.ownership]}.`
    : "";
  // One live region for the whole dialog, always mounted so changes to it
  // are announced (a region that mounts with its message often isn't).
  const statusMessage =
    step === "added" ? addedMessage : step === "search" ? searchStatusMessage : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={titleByStep[step]}
        description={descriptionByStep[step]}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusTo.current?.focus();
        }}
      >
        <p role="status" className="sr-only">
          {statusMessage}
        </p>

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

            <div className="max-h-80 min-h-24 overflow-y-auto rounded-lg">
              {searching && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader className="h-4 w-4" />
                  Searching...
                </div>
              )}

              {!searching && trimmedQuery && searchError && (
                <ErrorMessage message={searchError} className="items-center py-8 text-center">
                  <Button variant="secondary" size="sm" onClick={handleRetry}>
                    Try again
                  </Button>
                </ErrorMessage>
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
                  <li key={`${result.source}-${result.mediaType}-${result.externalId}`}>
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
              key={`${selected.source}:${selected.mediaType}:${selected.externalId}`}
              mediaType={selected.mediaType}
              value={platforms}
              onChange={setPlatforms}
            />

            {saveError && (
              <ErrorMessage message={saveError}>
                {existingEntry && onOpenExisting && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onOpenExisting(existingEntry);
                      handleOpenChange(false);
                    }}
                  >
                    Open it
                  </Button>
                )}
              </ErrorMessage>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(null);
                  setSaveError(null);
                  setExistingEntry(null);
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
        {step === "added" && added && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-surface-foreground">{addedMessage}</p>
                {/* The status it starts in, and what was recorded with it.
                    Wishlist items show neither, here or elsewhere. */}
                {added.ownership === "OWNED" && (
                  <p className="text-sm text-muted-foreground">
                    {getStatusLabel(added.status, added.mediaItem.mediaType)}
                    {added.platforms.length > 0 && ` · ${added.platforms.join(", ")}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => handleOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Done
              </Button>
              {/* Keeps the media type, which is one click to change on search. */}
              <Button autoFocus onClick={reset} className="w-full sm:w-auto">
                Add another
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
