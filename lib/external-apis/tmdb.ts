import type { UnifiedSearchResult } from "@/types/media";
import { normalizeTmdbDetails, normalizeTmdbResult } from "./normalize";
import type { TmdbDetails, TmdbSearchResponse } from "./types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

class TmdbApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "TmdbApiError";
  }
}

/**
 * Searches TMDB for movies or TV shows and returns normalized results.
 * Requires TMDB_API_KEY to be set (a v3 API key, not a read access token).
 */
export async function searchTmdb(
  query: string,
  mediaType: "MOVIE" | "TV",
): Promise<UnifiedSearchResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not configured");
  }

  const endpoint = mediaType === "MOVIE" ? "search/movie" : "search/tv";
  const url = new URL(`${TMDB_BASE_URL}/${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    // Results for a given query rarely change within an hour, and repeat
    // searches (retyping, other users) are common. TMDB's terms allow
    // caching for up to six months. Next only caches 200 responses.
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new TmdbApiError(
      `TMDB search failed with status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as TmdbSearchResponse;
  return data.results.map((result) => normalizeTmdbResult(result, mediaType));
}

/**
 * Fetches one movie or TV show by its TMDB id. Returns null when TMDB has no
 * such title; throws when TMDB can't be reached or isn't configured.
 */
export async function getTmdbDetails(
  id: string,
  mediaType: "MOVIE" | "TV",
): Promise<UnifiedSearchResult | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not configured");
  }

  const endpoint = mediaType === "MOVIE" ? "movie" : "tv";
  const url = new URL(`${TMDB_BASE_URL}/${endpoint}/${encodeURIComponent(id)}`);
  url.searchParams.set("api_key", apiKey);

  // Only called when adding a new title or refreshing one on request, so
  // it should see TMDB's current data rather than a cached copy.
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new TmdbApiError(`TMDB details failed with status ${response.status}`, response.status);
  }

  return normalizeTmdbDetails((await response.json()) as TmdbDetails, mediaType);
}
