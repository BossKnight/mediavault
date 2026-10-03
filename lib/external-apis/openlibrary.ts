import type { UnifiedSearchResult } from "@/types/media";
import {
  normalizeOpenLibraryBookData,
  normalizeOpenLibrarySearchDoc,
  normalizeOpenLibraryWork,
} from "./normalize";
import { lookupGoogleBooksByIsbn } from "./googlebooks";
import type {
  OpenLibraryAuthor,
  OpenLibraryIsbnResponse,
  OpenLibrarySearchResponse,
  OpenLibraryWork,
} from "./types";

const OPEN_LIBRARY_BASE_URL = "https://openlibrary.org";

class OpenLibraryApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "OpenLibraryApiError";
  }
}

/**
 * Searches Open Library by title/author and returns normalized results.
 * No API key required.
 */
export async function searchOpenLibrary(query: string): Promise<UnifiedSearchResult[]> {
  const url = new URL(`${OPEN_LIBRARY_BASE_URL}/search.json`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    // Open Library asks clients to cache whenever possible. Next only
    // caches 200 responses.
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new OpenLibraryApiError(
      `Open Library search failed with status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as OpenLibrarySearchResponse;
  return data.docs.map(normalizeOpenLibrarySearchDoc);
}

/**
 * Resolves a single ISBN to a book — the barcode-scan lookup path. Open
 * Library is the primary source; when its result is missing a cover or
 * description (or it has no edition on file at all), Google Books is
 * queried to fill just those fields in, since its catalog tends to be more
 * complete for exactly that data. Returns null only if neither provider
 * has anything for this ISBN.
 */
export async function lookupIsbn(isbn: string): Promise<UnifiedSearchResult | null> {
  const url = new URL(`${OPEN_LIBRARY_BASE_URL}/api/books`);
  url.searchParams.set("bibkeys", `ISBN:${isbn}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("jscmd", "data");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    // An ISBN's edition data almost never changes, so this can live longer
    // than search results.
    next: { revalidate: 24 * 60 * 60 },
  });

  if (!response.ok) {
    throw new OpenLibraryApiError(
      `Open Library ISBN lookup failed with status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as OpenLibraryIsbnResponse;
  const bookData = data[`ISBN:${isbn}`];
  let result = bookData ? normalizeOpenLibraryBookData(isbn, bookData) : null;

  if (!result || !result.coverUrl || !result.overview) {
    const googleResult = await lookupGoogleBooksByIsbn(isbn).catch(() => null);
    if (googleResult) {
      result = result
        ? {
            ...result,
            coverUrl: result.coverUrl ?? googleResult.coverUrl,
            overview: result.overview ?? googleResult.overview,
          }
        : googleResult;
    }
  }

  return result;
}

/**
 * Fetches one work (what a title search returns) by its id, e.g. "OL45804W".
 * The first author's name takes a second request; if that one fails the
 * work is still returned, just without an author. Returns null when Open
 * Library has no such work; throws when it can't be reached.
 */
export async function getOpenLibraryWork(workId: string): Promise<UnifiedSearchResult | null> {
  const response = await fetch(`${OPEN_LIBRARY_BASE_URL}/works/${encodeURIComponent(workId)}.json`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new OpenLibraryApiError(
      `Open Library work lookup failed with status ${response.status}`,
      response.status,
    );
  }

  const work = (await response.json()) as OpenLibraryWork;
  const authorKey = work.authors?.[0]?.author?.key;
  // The key goes into a URL, so only an author key of the expected shape is followed.
  const authorName =
    authorKey && /^\/authors\/OL\d+A$/.test(authorKey)
      ? await getOpenLibraryAuthorName(authorKey).catch(() => null)
      : null;
  return normalizeOpenLibraryWork(workId, work, authorName);
}

async function getOpenLibraryAuthorName(authorKey: string): Promise<string | null> {
  const response = await fetch(`${OPEN_LIBRARY_BASE_URL}${authorKey}.json`, {
    headers: { Accept: "application/json" },
    // An author's name is about as stable as data gets.
    next: { revalidate: 24 * 60 * 60 },
  });
  if (!response.ok) return null;
  return ((await response.json()) as OpenLibraryAuthor).name?.trim() || null;
}
