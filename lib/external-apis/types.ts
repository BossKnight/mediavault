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

export interface RawgGame {
  id: number;
  name: string;
  released?: string | null;
  background_image?: string | null;
  genres?: { name: string }[];
  developers?: { name: string }[];
}

export interface RawgSearchResponse {
  results: RawgGame[];
}
