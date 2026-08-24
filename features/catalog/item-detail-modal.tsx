"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WATCH_STATUS_LABELS, type CatalogEntry, type WatchStatus } from "@/types/media";

const STATUS_OPTIONS: WatchStatus[] = [
  "PLAN_TO_WATCH",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];

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
  const [currentSeason, setCurrentSeason] = useState(entry.currentSeason?.toString() ?? "");
  const [currentEpisode, setCurrentEpisode] = useState(entry.currentEpisode?.toString() ?? "");
  const [platform, setPlatform] = useState(entry.platform ?? "");
  const [hoursPlayed, setHoursPlayed] = useState(entry.hoursPlayed?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      status,
      rating,
      reviewNotes: reviewNotes.trim() || null,
    };
    if (mediaItem.mediaType === "TV") {
      body.currentSeason = currentSeason ? Number(currentSeason) : null;
      body.currentEpisode = currentEpisode ? Number(currentEpisode) : null;
    }
    if (mediaItem.mediaType === "GAME") {
      body.platform = platform.trim() || null;
      body.hoursPlayed = hoursPlayed ? Number(hoursPlayed) : null;
    }

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
              <p className="text-sm text-muted">
                {mediaItem.releaseDate?.slice(0, 4) ?? "Unknown year"}
                {mediaItem.creator ? ` · ${mediaItem.creator}` : ""}
              </p>
              {mediaItem.genres.length > 0 && (
                <p className="mt-1 text-xs text-muted">{mediaItem.genres.join(", ")}</p>
              )}
              {mediaItem.overview && (
                <p className="mt-2 line-clamp-4 text-xs text-muted">{mediaItem.overview}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-white">Status</span>
              <Select value={status} onValueChange={(value) => setStatus(value as WatchStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {WATCH_STATUS_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-white">Your rating</span>
              <StarRating value={rating} onChange={setRating} />
            </div>
          </div>

          {mediaItem.mediaType === "TV" && (
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-white">Season</span>
                <Input
                  type="number"
                  min={0}
                  value={currentSeason}
                  onChange={(event) => setCurrentSeason(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-white">Episode</span>
                <Input
                  type="number"
                  min={0}
                  value={currentEpisode}
                  onChange={(event) => setCurrentEpisode(event.target.value)}
                />
              </label>
            </div>
          )}

          {mediaItem.mediaType === "GAME" && (
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-white">Platform</span>
                <Input
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  placeholder="PS5, PC, Switch..."
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-white">Hours played</span>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={hoursPlayed}
                  onChange={(event) => setHoursPlayed(event.target.value)}
                />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-white">Review notes</span>
            <Textarea
              rows={3}
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="What did you think?"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Remove from catalog?</span>
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
              <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
                Remove
              </Button>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
