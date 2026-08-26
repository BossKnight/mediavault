import type { UnifiedSearchResult } from "@/types/media";
import { normalizeGoogleBooksVolume } from "./normalize";
import type { GoogleBooksResponse } from "./types";

const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes";

/**
 * Looks up a single ISBN against Google Books. Only called from
 * lookupIsbn (openlibrary.ts) to backfill a cover or description Open
 * Library is missing — Open Library stays the primary source since it
 * needs no API key. Runs unauthenticated by default; set
 * GOOGLE_BOOKS_API_KEY to raise the quota if the unauthenticated rate
 * limit ever becomes a problem. Returns null on any failure rather than
 * throwing, since this is an optional enrichment step, not the main path.
 */
export async function lookupGoogleBooksByIsbn(isbn: string): Promise<UnifiedSearchResult | null> {
  const url = new URL(GOOGLE_BOOKS_BASE_URL);
  url.searchParams.set("q", `isbn:${isbn}`);
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data = (await response.json()) as GoogleBooksResponse;
  const info = data.items?.[0]?.volumeInfo;
  return info ? normalizeGoogleBooksVolume(isbn, info) : null;
}
