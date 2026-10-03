"use client";

import Image from "next/image";
import { StarRating } from "@/components/ui/star-rating";
import { StatusBadge } from "@/features/catalog/status-badge";
import { CoverArt } from "@/features/catalog/cover-art";
import { Badge } from "@/components/ui/badge";
import type { CatalogEntry } from "@/types/media";

// Cards are narrow, so a long platform list is cut to this many chips plus a
// "+N" chip carrying the rest.
const MAX_VISIBLE_PLATFORMS = 3;

interface CatalogItemCardProps {
  entry: CatalogEntry;
  onSelect: (entry: CatalogEntry) => void;
  // Set for the first visible row of cards so Next eagerly fetches (and
  // hints as high fetch-priority) whichever of them is likely this page's
  // LCP element. Left false for the rest, which stay lazy as normal.
  priority?: boolean;
}

export function CatalogItemCard({ entry, onSelect, priority }: CatalogItemCardProps) {
  const { mediaItem } = entry;
  // Wishlist entries can keep platforms from when they were owned, but they
  // aren't copies on the shelf, so only owned entries show them.
  const platforms = entry.ownership === "OWNED" ? entry.platforms : [];
  const visiblePlatforms = platforms.slice(0, MAX_VISIBLE_PLATFORMS);
  const hiddenPlatforms = platforms.slice(MAX_VISIBLE_PLATFORMS);

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
            priority={priority}
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
        {platforms.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {visiblePlatforms.map((platform) => (
              <Badge key={platform} className="px-2 py-0 text-[11px]">
                {platform}
              </Badge>
            ))}
            {hiddenPlatforms.length > 0 && (
              <Badge className="px-2 py-0 text-[11px]" title={hiddenPlatforms.join(", ")}>
                +{hiddenPlatforms.length}
                <span className="sr-only"> more: {hiddenPlatforms.join(", ")}</span>
              </Badge>
            )}
          </span>
        )}
        {entry.ownership === "OWNED" && <StarRating value={entry.rating} readOnly className="mt-1" />}
      </div>
    </button>
  );
}
