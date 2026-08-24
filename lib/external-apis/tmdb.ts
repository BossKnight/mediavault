import type { UnifiedSearchResult } from "@/types/media";
import { normalizeTmdbResult } from "./normalize";
import type { TmdbSearchResponse } from "./types";

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
    // Search results change often enough that caching isn't worth the
    // staleness risk for a "what's out there right now" flow.
    cache: "no-store",
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
