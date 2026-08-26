"use client";

import Image from "next/image";
import { StarRating } from "@/components/ui/star-rating";
import { StatusBadge } from "@/features/catalog/status-badge";
import { CoverArt } from "@/features/catalog/cover-art";
import { Badge } from "@/components/ui/badge";
import type { CatalogEntry } from "@/types/media";

interface CatalogItemCardProps {
  entry: CatalogEntry;
  onSelect: (entry: CatalogEntry) => void;
}

export function CatalogItemCard({ entry, onSelect }: CatalogItemCardProps) {
  const { mediaItem } = entry;

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="focus-ring group flex flex-col overflow-hidden rounded-card border border-border bg-surface text-left transition-colors hover:border-muted-foreground"
    >
      <div className="relative aspect-[2/3] w-full bg-surface-raised">
        {mediaItem.coverUrl ? (
          <Image
            src={mediaItem.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 45vw"
            className="object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <CoverArt
            id={mediaItem.id}
            title={mediaItem.title}
            mediaType={mediaItem.mediaType}
            className="h-full w-full"
          />
        )}
        <div className="absolute right-2 top-2">
          {entry.ownership === "WISHLIST" ? (
            <Badge>Wishlist</Badge>
          ) : (
            <StatusBadge status={entry.status} mediaType={mediaItem.mediaType} />
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium text-surface-foreground">{mediaItem.title}</p>
        <p className="text-xs text-muted-foreground">
          {mediaItem.releaseDate?.slice(0, 4) ?? "Unknown year"}
        </p>
        {entry.ownership === "OWNED" && <StarRating value={entry.rating} readOnly className="mt-1" />}
      </div>
    </button>
  );
}
