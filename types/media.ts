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
  currentSeason: number | null;
  currentEpisode: number | null;
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
