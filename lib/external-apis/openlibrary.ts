import type { UnifiedSearchResult } from "@/types/media";
import { normalizeOpenLibraryBookData, normalizeOpenLibrarySearchDoc } from "./normalize";
import { lookupGoogleBooksByIsbn } from "./googlebooks";
import type { OpenLibraryIsbnResponse, OpenLibrarySearchResponse } from "./types";

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
 * No API key required — this is the one provider in the app that doesn't
 * need one.
 */
export async function searchOpenLibrary(query: string): Promise<UnifiedSearchResult[]> {
  const url = new URL(`${OPEN_LIBRARY_BASE_URL}/search.json`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
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
    cache: "no-store",
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
