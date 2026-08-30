import type { Prisma } from "@prisma/client";
import type {
  CatalogEntry,
  CatalogStats,
  WatchStatus,
  MediaType,
  OwnershipStatus,
} from "@/types/media";

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
    ownership: row.ownership as OwnershipStatus,
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
      isbn: row.mediaItem.isbn,
    },
  };
}

// Only these fields are ever read, so a stats-only Prisma query (see
// lib/catalog-db.ts's fetchCatalogStats) can select just this narrow
// shape rather than the full CatalogEntry — a real CatalogEntry[] still
// satisfies this structurally, so every existing caller is unaffected.
type StatsSourceEntry = Pick<CatalogEntry, "status" | "rating"> & {
  mediaItem: Pick<CatalogEntry["mediaItem"], "mediaType">;
};

export function computeStats(entries: StatsSourceEntry[]): CatalogStats {
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
    BOOK: 0,
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
 * A lightweight "what to try next" heuristic: surfaces plan-to-watch titles
 * in the genres the user rates highest. It only looks at the user's own
 * rated entries, not a real recommendation engine, just enough to point at
 * something worth trying next.
 *
 * Note: this only sees whatever page(s) of the catalog are currently
 * loaded in the client (see catalog-view.tsx) — with the catalog now
 * paginated, that's the same honest "not exhaustive" tradeoff the
 * function already made about being a real recommendation engine, just
 * extended to cover collections larger than one page too.
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
    .filter((entry) => entry.ownership === "OWNED")
    .filter((entry) => entry.status === "PLAN_TO_WATCH")
    .filter((entry) => entry.mediaItem.genres.some((genre) => favoredGenres.has(genre)))
    .slice(0, 4);
}
