// Shared types for the unified media model. These are the shapes that cross
// the boundary between external metadata providers (TMDB, RAWG), the
// database, and the UI.

export type MediaType = "MOVIE" | "TV" | "GAME";

export type MetadataSource = "TMDB" | "RAWG";

export type WatchStatus =
  | "PLAN_TO_WATCH"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ON_HOLD"
  | "DROPPED";

export const WATCH_STATUS_LABELS: Record<WatchStatus, string> = {
  PLAN_TO_WATCH: "Plan to Watch",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  DROPPED: "Dropped",
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  MOVIE: "Movie",
  TV: "TV Show",
  GAME: "Game",
};

/**
 * Games use "In Backlog" in place of "Plan to Watch" and don't offer
 * "On Hold" at all. The underlying WatchStatus values are shared across
 * media types (no schema difference) — only the label and the set of
 * choices offered in the UI vary.
 */
export function getStatusOptions(mediaType: MediaType): WatchStatus[] {
  if (mediaType === "GAME") {
    return ["PLAN_TO_WATCH", "IN_PROGRESS", "COMPLETED", "DROPPED"];
  }
  return ["PLAN_TO_WATCH", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "DROPPED"];
}

export function getStatusLabel(status: WatchStatus, mediaType: MediaType): string {
  if (mediaType === "GAME" && status === "PLAN_TO_WATCH") {
    return "In Backlog";
  }
  return WATCH_STATUS_LABELS[status];
}

/**
 * Physical media format for movies and TV shows, stored in the same
 * `platform` column games use for their platform (PS5, PC, Switch, ...).
 */
export const PHYSICAL_FORMATS = ["VHS", "DVD", "Blu-Ray", "4K UHD"] as const;
export type PhysicalFormat = (typeof PHYSICAL_FORMATS)[number];

/**
 * A single search result, normalized from whichever external provider
 * produced it. This is the shape every provider adapter must return, and the
 * shape the "Add Item" flow works with before anything is persisted.
 */
export interface UnifiedSearchResult {
  source: MetadataSource;
  externalId: string;
  mediaType: MediaType;
  title: string;
  releaseDate: string | null; // ISO date string, e.g. "2010-07-16"
  coverUrl: string | null;
  overview: string | null;
  genres: string[];
  creator: string | null;
}

/**
 * A catalog entry as the frontend consumes it: the global media metadata
 * joined with the current user's personal progress on it.
 */
export interface CatalogEntry {
  id: string; // UserMediaProgress id
  status: WatchStatus;
  rating: number | null;
  reviewNotes: string | null;
  ownedSeasons: number[];
  completeSeries: boolean;
  platform: string | null;
  hoursPlayed: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  mediaItem: {
    id: string;
    source: MetadataSource;
    externalId: string;
    mediaType: MediaType;
    title: string;
    releaseDate: string | null;
    coverUrl: string | null;
    overview: string | null;
    genres: string[];
    creator: string | null;
  };
}

export interface CatalogStats {
  total: number;
  byStatus: Record<WatchStatus, number>;
  byMediaType: Record<MediaType, number>;
  averageRating: number | null;
}

/** How the catalog grid orders entries. Defaults to "recent". */
export type CatalogSort = "recent" | "title" | "rating";

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  recent: "Recently added",
  title: "Title",
  rating: "Rating",
};
