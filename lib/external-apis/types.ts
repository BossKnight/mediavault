// Minimal shapes for the slices of the TMDB and RAWG payloads we actually
// use. These are intentionally partial — we only declare the fields the
// normalizer reads, not the full API response.

export interface TmdbMovieResult {
  id: number;
  media_type?: "movie" | "tv";
  title?: string; // movies
  name?: string; // tv shows
  release_date?: string; // movies
  first_air_date?: string; // tv shows
  overview?: string | null;
  poster_path?: string | null;
  genre_ids?: number[];
}

export interface TmdbSearchResponse {
  results: TmdbMovieResult[];
}

// RAWG's /games search endpoint (what searchRawg calls) does not include
// developer info: that only exists on the separate /games/{id} details
// endpoint, which nothing here calls. Don't add a `developers` field back
// without also adding that lookup, or it'll silently stay unpopulated.
export interface RawgGame {
  id: number;
  name: string;
  released?: string | null;
  background_image?: string | null;
  genres?: { name: string }[];
}

export interface RawgSearchResponse {
  results: RawgGame[];
}
