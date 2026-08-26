import type { MediaType, UnifiedSearchResult } from "@/types/media";
import { searchTmdb } from "./tmdb";
import { searchRawg } from "./rawg";
import { searchOpenLibrary } from "./openlibrary";

export type { UnifiedSearchResult };

/**
 * Unified entry point for the discovery search flow. Proxies to the
 * appropriate external provider based on media type and returns normalized
 * results, so the rest of the app never has to know TMDB and RAWG exist.
 */
export async function searchMedia(
  query: string,
  mediaType: MediaType,
): Promise<UnifiedSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  switch (mediaType) {
    case "MOVIE":
      return searchTmdb(trimmed, "MOVIE");
    case "TV":
      return searchTmdb(trimmed, "TV");
    case "GAME":
      return searchRawg(trimmed);
    case "BOOK":
      return searchOpenLibrary(trimmed);
  }
}
