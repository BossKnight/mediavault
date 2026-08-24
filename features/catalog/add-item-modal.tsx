"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader, Search } from "@/components/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  MEDIA_TYPE_LABELS,
  PHYSICAL_FORMATS,
  type CatalogEntry,
  type MediaType,
  type UnifiedSearchResult,
} from "@/types/media";

const MEDIA_TYPES: MediaType[] = ["MOVIE", "TV", "GAME"];
// Sentinel for "no format/platform set" — Radix Select items can't use "".
const PLATFORM_NONE = "NONE";

interface AddItemModalProps {
  onAdded: (entry: CatalogEntry) => void;
}

/**
 * The full "Add Item" discovery flow: an autocomplete search bar against the
 * external metadata APIs, followed by a platform-picker step before the
 * selected result is saved to the catalog. New items default to "Plan to
 * Watch" (or "In Backlog" for games) — the initial status isn't asked here.
 */
export function AddItemModal({ onAdded }: AddItemModalProps) {
  const [open, setOpen] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>("MOVIE");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UnifiedSearchResult | null>(null);
  const [platform, setPlatform] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const trimmedQuery = debouncedQuery.trim();

  useEffect(() => {
    if (!trimmedQuery) return;

    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);

    fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&type=${mediaType.toLowerCase()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as { results: UnifiedSearchResult[] };
        setResults(data.results);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchError("Couldn't load results. Try again.");
        setResults([]);
      })
      .finally(() => setSearching(false));

    return () => controller.abort();
  }, [trimmedQuery, mediaType]);

  // Once the query is cleared, stop showing results from the previous query
  // rather than clearing `results` itself in an effect.
  const visibleResults = trimmedQuery ? results : [];

  function reset() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setSaveError(null);
    setPlatform("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selected, platform: platform.trim() || null }),
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
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>+ Add Item</Button>
      </DialogTrigger>
      <DialogContent
        title={selected ? "Add to your catalog" : "Discover something new"}
        description={
          selected
            ? undefined
            : "Search movies, TV shows, and games to add to your collection."
        }
      >
        {!selected ? (
          <div className="flex flex-col gap-4">
            <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
              {MEDIA_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
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

            <div className="max-h-80 min-h-24 overflow-y-auto rounded-lg">
              {searching && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader className="h-4 w-4" />
                  Searching...
                </div>
              )}

              {!searching && trimmedQuery && searchError && (
                <p className="py-8 text-center text-sm text-danger">{searchError}</p>
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
                      onClick={() => setSelected(result)}
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
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="relative h-32 w-22 shrink-0 overflow-hidden rounded-lg bg-surface-raised">
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

            {(selected.mediaType === "MOVIE" || selected.mediaType === "TV") ? (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-surface-foreground">Platform</span>
                <Select
                  value={platform || PLATFORM_NONE}
                  onValueChange={(value) => setPlatform(value === PLATFORM_NONE ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PLATFORM_NONE}>Not set</SelectItem>
                    {PHYSICAL_FORMATS.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ) : (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-surface-foreground">Platform</span>
                <Input
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  placeholder="PS5, PC, Switch..."
                />
              </label>
            )}

            {saveError && <p className="text-sm text-danger">{saveError}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelected(null)} disabled={saving}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save to catalog"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
