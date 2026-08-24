import type { Prisma } from "@prisma/client";
import type { CatalogEntry, CatalogStats, WatchStatus, MediaType } from "@/types/media";

/** Shared Prisma include so every route returns the same joined shape. */
export const catalogEntryInclude = {
  mediaItem: true,
} satisfies Prisma.UserMediaProgressInclude;

type ProgressWithMediaItem = Prisma.UserMediaProgressGetPayload<{
  include: typeof catalogEntryInclude;
}>;

/** Converts a Prisma UserMediaProgress + MediaItem row into the API/UI shape. */
export function toCatalogEntry(row: ProgressWithMediaItem): CatalogEntry {
  return {
    id: row.id,
    status: row.status as WatchStatus,
    rating: row.rating,
    reviewNotes: row.reviewNotes,
    currentSeason: row.currentSeason,
    currentEpisode: row.currentEpisode,
    platform: row.platform,
    hoursPlayed: row.hoursPlayed,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    mediaItem: {
      id: row.mediaItem.id,
      source: row.mediaItem.source,
      externalId: row.mediaItem.externalId,
      mediaType: row.mediaItem.mediaType as MediaType,
      title: row.mediaItem.title,
      releaseDate: row.mediaItem.releaseDate?.toISOString() ?? null,
      coverUrl: row.mediaItem.coverUrl,
      overview: row.mediaItem.overview,
      genres: row.mediaItem.genres,
      creator: row.mediaItem.creator,
    },
  };
}

export function computeStats(entries: CatalogEntry[]): CatalogStats {
  const byStatus: Record<WatchStatus, number> = {
    PLAN_TO_WATCH: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    ON_HOLD: 0,
    DROPPED: 0,
  };
  const byMediaType: Record<MediaType, number> = {
    MOVIE: 0,
    TV: 0,
    GAME: 0,
  };

  let ratingSum = 0;
  let ratingCount = 0;

  for (const entry of entries) {
    byStatus[entry.status] += 1;
    byMediaType[entry.mediaItem.mediaType] += 1;
    if (entry.rating != null) {
      ratingSum += entry.rating;
      ratingCount += 1;
    }
  }

  return {
    total: entries.length,
    byStatus,
    byMediaType,
    averageRating: ratingCount > 0 ? ratingSum / ratingCount : null,
  };
}
