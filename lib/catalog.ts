import type { Prisma } from "@prisma/client";
import type { CatalogEntry, CatalogSort, CatalogStats, WatchStatus, MediaType } from "@/types/media";

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
    ownedSeasons: row.ownedSeasons,
    completeSeries: row.completeSeries,
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

/**
 * Returns a new array, sorted for catalog display. "recent" orders by when
 * the item was added to the catalog (not last edited), "title" is
 * alphabetical, and "rating" puts the highest-rated items first with
 * unrated items last regardless of direction.
 */
export function sortCatalogEntries(entries: CatalogEntry[], sort: CatalogSort): CatalogEntry[] {
  const sorted = [...entries];

  switch (sort) {
    case "title":
      sorted.sort((a, b) => a.mediaItem.title.localeCompare(b.mediaItem.title));
      break;
    case "rating":
      sorted.sort((a, b) => {
        if (a.rating == null && b.rating == null) return 0;
        if (a.rating == null) return 1;
        if (b.rating == null) return -1;
        return b.rating - a.rating;
      });
      break;
    case "recent":
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }

  return sorted;
}

/**
 * A lightweight "what to try next" heuristic: surfaces plan-to-watch titles
 * in the genres the user rates highest. It only looks at the user's own
 * rated entries, not a real recommendation engine, just enough to point at
 * something worth trying next.
 */
export function recommendNext(entries: CatalogEntry[]): CatalogEntry[] {
  const genreScore = new Map<string, { sum: number; count: number }>();
  for (const entry of entries) {
    if (entry.rating == null) continue;
    for (const genre of entry.mediaItem.genres) {
      const current = genreScore.get(genre) ?? { sum: 0, count: 0 };
      current.sum += entry.rating;
      current.count += 1;
      genreScore.set(genre, current);
    }
  }

  const favoredGenres = new Set(
    [...genreScore.entries()]
      .sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)
      .slice(0, 3)
      .map(([genre]) => genre),
  );

  return entries
    .filter((entry) => entry.status === "PLAN_TO_WATCH")
    .filter((entry) => entry.mediaItem.genres.some((genre) => favoredGenres.has(genre)))
    .slice(0, 4);
}
