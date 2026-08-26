import type { UnifiedSearchResult } from "@/types/media";
import { normalizeRawgResult } from "./normalize";
import type { RawgSearchResponse } from "./types";

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
    cache: "no-store",
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
