// Shared types for the unified media model. These are the shapes that cross
// the boundary between external metadata providers (TMDB, RAWG, Open
// Library), the database, and the UI.

export type MediaType = "MOVIE" | "TV" | "GAME" | "BOOK";

export type MetadataSource = "TMDB" | "RAWG" | "OPENLIBRARY";

export type WatchStatus =
  | "PLAN_TO_WATCH"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ON_HOLD"
  | "DROPPED";

export const WATCH_STATUS_LABELS: Record<WatchStatus, string> = {
  PLAN_TO_WATCH: "In backlog",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
  DROPPED: "Dropped",
};

/** Whether the user owns a title or just wants to — a separate axis from WatchStatus. */
export type OwnershipStatus = "OWNED" | "WISHLIST";

export const OWNERSHIP_STATUS_LABELS: Record<OwnershipStatus, string> = {
  OWNED: "Owned",
  WISHLIST: "Wishlist",
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  MOVIE: "Movie",
  TV: "TV show",
  GAME: "Game",
  BOOK: "Book",
};

/**
 * Games don't offer "On hold" at all. The underlying WatchStatus values
 * are shared across media types (no schema difference) — only the label
 * and the set of choices offered in the UI vary.
 */
export function getStatusOptions(mediaType: MediaType): WatchStatus[] {
  if (mediaType === "GAME") {
    return ["PLAN_TO_WATCH", "IN_PROGRESS", "COMPLETED", "DROPPED"];
  }
  return ["PLAN_TO_WATCH", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "DROPPED"];
}

// Books use their own reading-specific words ("To read" reads more
// naturally than "In backlog" for a book) — every other media type shares
// the default WATCH_STATUS_LABELS wording, including "In backlog".
export function getStatusLabel(status: WatchStatus, mediaType: MediaType): string {
  if (mediaType === "BOOK") {
    if (status === "PLAN_TO_WATCH") return "To read";
    if (status === "IN_PROGRESS") return "Reading";
    if (status === "COMPLETED") return "Read";
  }
  return WATCH_STATUS_LABELS[status];
}

/**
 * Physical media formats for movies and TV shows, stored in the same
 * `platforms` list games use for their platforms (PS5, PC, Switch, ...).
 */
export const PHYSICAL_FORMATS = ["VHS", "DVD", "Blu-Ray", "4K UHD"] as const;
export type PhysicalFormat = (typeof PHYSICAL_FORMATS)[number];

/** Physical book formats, stored in the same `platforms` list as above. */
export const BOOK_FORMATS = ["Hardcover", "Paperback", "Mass Market Paperback", "Audiobook"] as const;
export type BookFormat = (typeof BOOK_FORMATS)[number];

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
  // Book only — carried through so a barcode-scanned title round-trips
  // straight to the catalog with its ISBN attached.
  isbn?: string | null;
}

/**
 * A catalog entry as the frontend consumes it: the global media metadata
 * joined with the current user's personal progress on it.
 */
export interface CatalogEntry {
  id: string; // UserMediaProgress id
  status: WatchStatus;
  ownership: OwnershipStatus;
  rating: number | null;
  reviewNotes: string | null;
  ownedSeasons: number[];
  completeSeries: boolean;
  // Every format or platform owned, e.g. ["DVD", "4K UHD"] or ["PS2", "Xbox"].
  platforms: string[];
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
    isbn: string | null;
  };
}

export interface CatalogStats {
  total: number;
  byStatus: Record<WatchStatus, number>;
  byMediaType: Record<MediaType, number>;
  averageRating: number | null;
}

/** How the catalog grid orders entries. Defaults to "recent". */
/** How the vault is laid out: cover thumbnails or a text list. */
export type CatalogLayout = "grid" | "list";

export type CatalogSort = "recent" | "title" | "rating";

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  recent: "Recently added",
  title: "Title",
  rating: "Rating",
};
