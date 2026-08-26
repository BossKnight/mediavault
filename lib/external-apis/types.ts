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

// Open Library's /search.json endpoint (searchOpenLibrary). Each "doc" is a
// work, not a specific edition — there's no ISBN here, only the ISBN
// endpoint below returns one.
export interface OpenLibrarySearchDoc {
  key: string; // e.g. "/works/OL45804W"
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
}

export interface OpenLibrarySearchResponse {
  docs: OpenLibrarySearchDoc[];
}

// Open Library's /api/books?jscmd=data endpoint (lookupIsbn) — a single
// edition, keyed by "ISBN:{isbn}" in the response.
export interface OpenLibraryBookData {
  key?: string; // e.g. "/books/OL2724993M"
  title?: string;
  authors?: { name: string }[];
  publish_date?: string;
  cover?: { small?: string; medium?: string; large?: string };
  subjects?: { name: string }[];
}

export type OpenLibraryIsbnResponse = Record<string, OpenLibraryBookData>;

// Google Books' /volumes endpoint — used only to backfill a cover or
// description Open Library is missing for a given ISBN.
export interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publishedDate?: string;
  description?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  categories?: string[];
}

export interface GoogleBooksResponse {
  items?: { volumeInfo?: GoogleBooksVolumeInfo }[];
}
