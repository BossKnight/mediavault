import type { MediaType, MetadataSource, UnifiedSearchResult } from "@/types/media";
import { isIsbn } from "@/lib/isbn";
import { getTmdbDetails, searchTmdb } from "./tmdb";
import { getRawgDetails, searchRawg } from "./rawg";
import { getOpenLibraryWork, lookupIsbn, searchOpenLibrary } from "./openlibrary";

export type { UnifiedSearchResult };

/**
 * Unified entry point for the discovery search flow. Proxies to the
 * appropriate external provider based on media type and returns normalized
 * results, so the rest of the app never has to know TMDB, RAWG, or Open
 * Library exist.
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

// Open Library work ids, e.g. "OL45804W". Other Open Library ids in the
// catalog are editions ("OL7353617M") or "ISBN-..." from a barcode scan,
// both looked up by ISBN.
const OPEN_LIBRARY_WORK_ID = /^OL\d+W$/;

/**
 * The provider's current metadata for one stored title, used to create and
 * refresh the shared MediaItem from the provider rather than from whatever
 * the client sent. Returns null when the provider has no such title, or
 * answers with a different one; throws when the provider can't be reached
 * or isn't configured.
 */
export async function lookupMediaDetails(item: {
  source: MetadataSource;
  externalId: string;
  mediaType: MediaType;
  isbn?: string | null;
}): Promise<UnifiedSearchResult | null> {
  let result: UnifiedSearchResult | null;
  switch (item.source) {
    case "TMDB":
      if (item.mediaType !== "MOVIE" && item.mediaType !== "TV") return null;
      result = await getTmdbDetails(item.externalId, item.mediaType);
      break;
    case "RAWG":
      if (item.mediaType !== "GAME") return null;
      result = await getRawgDetails(item.externalId);
      break;
    case "OPENLIBRARY": {
      if (item.mediaType !== "BOOK") return null;
      if (OPEN_LIBRARY_WORK_ID.test(item.externalId)) {
        result = await getOpenLibraryWork(item.externalId);
        break;
      }
      const isbn = (
        item.externalId.startsWith("ISBN-") ? item.externalId.slice("ISBN-".length) : (item.isbn ?? "")
      )
        .replace(/[^0-9Xx]/g, "")
        .toUpperCase();
      if (!isIsbn(isbn)) throw new Error(`No ISBN to look up Open Library edition ${item.externalId}`);
      result = await lookupIsbn(isbn);
      break;
    }
  }
  return result && result.externalId === item.externalId && result.mediaType === item.mediaType
    ? result
    : null;
}
