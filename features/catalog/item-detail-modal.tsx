"use client";

import { useId, useMemo, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { formatSeasonList, parseSeasonInput } from "@/lib/seasons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BOOK_FORMATS,
  OWNERSHIP_STATUS_LABELS,
  PHYSICAL_FORMATS,
  getStatusLabel,
  getStatusOptions,
  type CatalogEntry,
  type OwnershipStatus,
  type WatchStatus,
} from "@/types/media";

const OWNERSHIP_OPTIONS: OwnershipStatus[] = ["OWNED", "WISHLIST"];

// Sentinel for "no format/platform set" — Radix Select items can't use "".
const PLATFORM_NONE = "NONE";

interface ItemDetailModalProps {
  entry: CatalogEntry | null;
  onClose: () => void;
  onUpdated: (entry: CatalogEntry) => void;
  onDeleted: (id: string) => void;
}

/**
 * Wrapper that only mounts the form while an entry is selected. Keying by
 * `entry.id` gives each selection a fresh component instance, so the form's
 * local state can initialize directly from `entry` instead of syncing to it
 * via an effect.
 */
export function ItemDetailModal({ entry, onClose, onUpdated, onDeleted }: ItemDetailModalProps) {
  if (!entry) return null;

  return (
    <ItemDetailForm
      key={entry.id}
      entry={entry}
      onClose={onClose}
      onUpdated={onUpdated}
      onDeleted={onDeleted}
    />
  );
}

interface ItemDetailFormProps {
  entry: CatalogEntry;
  onClose: () => void;
  onUpdated: (entry: CatalogEntry) => void;
  onDeleted: (id: string) => void;
}

function ItemDetailForm({ entry, onClose, onUpdated, onDeleted }: ItemDetailFormProps) {
  const { mediaItem } = entry;
  const entryId = entry.id;

  const [status, setStatus] = useState<WatchStatus>(entry.status);
  const [rating, setRating] = useState<number | null>(entry.rating);
  const [reviewNotes, setReviewNotes] = useState(entry.reviewNotes ?? "");
  const [completeSeries, setCompleteSeries] = useState(entry.completeSeries);
  const [ownedSeasonsText, setOwnedSeasonsText] = useState(formatSeasonList(entry.ownedSeasons));
  const [platform, setPlatform] = useState(entry.platform ?? "");
  const [ownership, setOwnership] = useState<OwnershipStatus>(entry.ownership);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedSeasons = useMemo(() => parseSeasonInput(ownedSeasonsText), [ownedSeasonsText]);
  const hasInvalidSeasons = parsedSeasons.invalidTokens.length > 0;
  const ownershipChanged = ownership !== entry.ownership;
  let saveLabel = "Save changes";
  if (ownershipChanged) saveLabel = ownership === "OWNED" ? "Move to catalog" : "Move to wishlist";

  const ownershipLabelId = useId();
  const seasonsInputId = useId();
  const seasonsHintId = useId();
  const seasonsErrorId = useId();

  async function handleSave() {
    setSaving(true);
    setError(null);

    // Ownership is saved together with every other field, so switching lists
    // never discards edits. The owned-only fields are hidden while the item
    // is set to Wishlist but still sent, so they survive a later move back.
    const body: Record<string, unknown> = {
      ownership,
      status,
      rating,
      reviewNotes: reviewNotes.trim() || null,
    };
    if (mediaItem.mediaType === "TV") {
      body.completeSeries = completeSeries;
      body.ownedSeasons = completeSeries ? [] : parsedSeasons.seasons;
    }
    // Movies and TV store their physical format (VHS/DVD/Blu-Ray/4K UHD),
    // books their format (Hardcover, Paperback...), and games their platform
    // (PS5, PC, Switch...) in the same `platform` field.
    body.platform = platform.trim() || null;

    try {
      const response = await fetch(`/api/catalog/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Couldn't save your changes.");
        return;
      }

      onUpdated(data.entry as CatalogEntry);
      onClose();
    } catch {
      setError("Couldn't save your changes. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/catalog/${entryId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Couldn't remove this item.");
        return;
      }
      onDeleted(entryId);
      onClose();
    } catch {
      setError("Couldn't remove this item. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent title={mediaItem.title} className="max-w-xl">
        <div className="flex flex-col gap-5">
          <div className="flex gap-4">
            <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-raised">
              {mediaItem.coverUrl && (
                <Image src={mediaItem.coverUrl} alt="" fill sizes="96px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">
                {mediaItem.releaseDate?.slice(0, 4) ?? "Unknown year"}
                {mediaItem.creator ? ` · ${mediaItem.creator}` : ""}
              </p>
              {mediaItem.genres.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{mediaItem.genres.join(", ")}</p>
              )}
              {mediaItem.overview && (
                <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">{mediaItem.overview}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-sm">
            <span id={ownershipLabelId} className="font-medium text-surface-foreground">
              Ownership
            </span>
            <div
              role="group"
              aria-labelledby={ownershipLabelId}
              className="flex gap-1 rounded-lg border border-border bg-surface p-1"
            >
              {OWNERSHIP_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setOwnership(option)}
                  disabled={saving}
                  aria-pressed={ownership === option}
                  className={`focus-ring min-h-10 flex-1 rounded-md py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    ownership === option
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-surface-foreground"
                  }`}
                >
                  {OWNERSHIP_STATUS_LABELS[option]}
                </button>
              ))}
            </div>
            {ownershipChanged && (
              <p className="text-xs text-muted-foreground">
                {ownership === "OWNED"
                  ? "Saving moves this to your catalog. Set its status and format below first if you like."
                  : "Saving moves this to your wishlist."}
              </p>
            )}
          </div>

          {ownership === "OWNED" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-surface-foreground">Status</span>
                  <Select value={status} onValueChange={(value) => setStatus(value as WatchStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatusOptions(mediaItem.mediaType).map((option) => (
                        <SelectItem key={option} value={option}>
                          {getStatusLabel(option, mediaItem.mediaType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <div className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-surface-foreground">Your rating</span>
                  <StarRating value={rating} onChange={setRating} />
                </div>
              </div>

              {mediaItem.mediaType === "TV" && (
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={completeSeries}
                      onChange={(event) => setCompleteSeries(event.target.checked)}
                    />
                    <span className="font-medium text-surface-foreground">Complete series (own every season)</span>
                  </label>

                  {!completeSeries && (
                    <div className="flex flex-col gap-1.5 text-sm">
                      <label htmlFor={seasonsInputId} className="font-medium text-surface-foreground">
                        Seasons owned
                      </label>
                      <Input
                        id={seasonsInputId}
                        value={ownedSeasonsText}
                        onChange={(event) => setOwnedSeasonsText(event.target.value)}
                        placeholder="e.g. 1, 2, 6"
                        aria-describedby={
                          hasInvalidSeasons ? `${seasonsHintId} ${seasonsErrorId}` : seasonsHintId
                        }
                        aria-invalid={hasInvalidSeasons ? true : undefined}
                      />
                      <span id={seasonsHintId} className="text-xs text-muted-foreground">
                        List the season numbers you own, separated by commas.
                      </span>
                      {parsedSeasons.seasons.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {parsedSeasons.seasons.map((season) => (
                            <Badge key={season} tone="accent">
                              Season {season}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {hasInvalidSeasons && (
                        <p id={seasonsErrorId} role="alert" className="text-xs text-danger">
                          Not recognized as season numbers, so they won&rsquo;t be saved:{" "}
                          {parsedSeasons.invalidTokens.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(mediaItem.mediaType === "MOVIE" || mediaItem.mediaType === "TV") && (
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
              )}

              {mediaItem.mediaType === "BOOK" && (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-surface-foreground">Format</span>
                  <Select
                    value={platform || PLATFORM_NONE}
                    onValueChange={(value) => setPlatform(value === PLATFORM_NONE ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PLATFORM_NONE}>Not set</SelectItem>
                      {BOOK_FORMATS.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}

              {mediaItem.mediaType === "GAME" && (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-surface-foreground">Platform</span>
                  <Input
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value)}
                    placeholder="PS5, PC, Switch..."
                  />
                </label>
              )}

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-surface-foreground">Notes</span>
                <Textarea rows={3} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} />
              </label>
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            {confirmingDelete ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Remove from your {entry.ownership === "OWNED" ? "catalog" : "wishlist"}?
                </span>
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Removing..." : "Confirm"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
                className="self-start sm:self-auto"
              >
                Remove
              </Button>
            )}

            <Button onClick={handleSave} disabled={saving || deleting} className="w-full sm:w-auto">
              {saving ? "Saving..." : saveLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
