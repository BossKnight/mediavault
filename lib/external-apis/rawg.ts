import type { UnifiedSearchResult } from "@/types/media";
import { normalizeRawgDetails, normalizeRawgResult } from "./normalize";
import type { RawgGameDetails, RawgSearchResponse } from "./types";

const RAWG_BASE_URL = "https://api.rawg.io/api";

class RawgApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "RawgApiError";
  }
}

/**
 * Searches RAWG for video games and returns normalized results.
 * Requires RAWG_API_KEY to be set.
 */
export async function searchRawg(query: string): Promise<UnifiedSearchResult[]> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    throw new Error("RAWG_API_KEY is not configured");
  }

  const url = new URL(`${RAWG_BASE_URL}/games`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("search", query);
  url.searchParams.set("page_size", "20");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    // RAWG encourages caching (the free plan is 20k requests a month), and
    // game search results are stable. Next only caches 200 responses.
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new RawgApiError(
      `RAWG search failed with status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as RawgSearchResponse;
  return data.results.map(normalizeRawgResult);
}

/**
 * Fetches one game by its RAWG id, including the description and developer
 * that search results lack. Returns null when RAWG has no such game; throws
 * when RAWG can't be reached or isn't configured.
 */
export async function getRawgDetails(id: string): Promise<UnifiedSearchResult | null> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    throw new Error("RAWG_API_KEY is not configured");
  }

  const url = new URL(`${RAWG_BASE_URL}/games/${encodeURIComponent(id)}`);
  url.searchParams.set("key", apiKey);

  // Only called when adding a new title or refreshing one on request.
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new RawgApiError(`RAWG details failed with status ${response.status}`, response.status);
  }

  return normalizeRawgDetails((await response.json()) as RawgGameDetails);
}
