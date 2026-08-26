// Pure functions that turn a raw TMDB or RAWG payload into a
// UnifiedSearchResult. Kept dependency-free (no fetch, no env access) so they
// are trivial to unit test.

import type { UnifiedSearchResult } from "@/types/media";
import type {
  GoogleBooksVolumeInfo,
  OpenLibraryBookData,
  OpenLibrarySearchDoc,
  RawgGame,
  TmdbMovieResult,
} from "./types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

// A small slice of TMDB's genre id -> name mapping, covering the genres most
// likely to appear in a personal collection. TMDB's `/search` endpoints only
// return genre_ids, not names, so we translate the common ones here rather
// than making a second request per result.
const TMDB_GENRE_NAMES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

export function normalizeTmdbResult(
  result: TmdbMovieResult,
  mediaType: "MOVIE" | "TV",
): UnifiedSearchResult {
  const title = mediaType === "MOVIE" ? result.title : result.name;
  const releaseDate =
    mediaType === "MOVIE" ? result.release_date : result.first_air_date;

  return {
    source: "TMDB",
    externalId: String(result.id),
    mediaType,
    title: title?.trim() || "Untitled",
    releaseDate: releaseDate || null,
    coverUrl: result.poster_path ? `${TMDB_IMAGE_BASE}${result.poster_path}` : null,
    overview: result.overview?.trim() || null,
    genres: (result.genre_ids ?? [])
      .map((id) => TMDB_GENRE_NAMES[id])
      .filter((name): name is string => Boolean(name)),
    // TMDB search results don't include crew/cast; the director/showrunner
    // is left null here and can be enriched via a details call if needed.
    creator: null,
  };
}

export function normalizeRawgResult(game: RawgGame): UnifiedSearchResult {
  return {
    source: "RAWG",
    externalId: String(game.id),
    mediaType: "GAME",
    title: game.name?.trim() || "Untitled",
    releaseDate: game.released || null,
    coverUrl: game.background_image || null,
    overview: null,
    genres: (game.genres ?? []).map((g) => g.name),
    // RAWG's search results don't include the developer, only its separate
    // per-game details endpoint does, so this is always null.
    creator: null,
  };
}

/** Pulls the first 4-digit year out of free-text date, e.g. "March 1994". */
function extractYear(dateText: string | undefined): string | null {
  const match = dateText?.match(/\d{4}/);
  return match ? `${match[0]}-01-01` : null;
}

// Open Library's search results are per work, not per edition, so there's
// no ISBN to carry through here — only lookupIsbn (a specific edition)
// returns one. Subjects double as genres: this is also how "Comics",
// "Graphic novels", "Manga", and other book categories surface, as
// free-form tags rather than a fixed taxonomy, the same way every other
// media type's genres already work.
export function normalizeOpenLibrarySearchDoc(doc: OpenLibrarySearchDoc): UnifiedSearchResult {
  return {
    source: "OPENLIBRARY",
    externalId: doc.key.replace(/^\/works\//, ""),
    mediaType: "BOOK",
    title: doc.title?.trim() || "Untitled",
    releaseDate: doc.first_publish_year ? `${doc.first_publish_year}-01-01` : null,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    overview: null,
    genres: (doc.subject ?? []).slice(0, 6),
    creator: doc.author_name?.[0] ?? null,
    isbn: null,
  };
}

export function normalizeOpenLibraryBookData(isbn: string, data: OpenLibraryBookData): UnifiedSearchResult {
  return {
    source: "OPENLIBRARY",
    externalId: data.key?.replace(/^\/books\//, "") || `ISBN-${isbn}`,
    mediaType: "BOOK",
    title: data.title?.trim() || "Untitled",
    releaseDate: extractYear(data.publish_date),
    coverUrl: data.cover?.medium ?? data.cover?.large ?? data.cover?.small ?? null,
    overview: null,
    genres: (data.subjects ?? []).map((subject) => subject.name).slice(0, 6),
    creator: data.authors?.[0]?.name ?? null,
    isbn,
  };
}

// Only ever used to fill in what Open Library is missing for a given ISBN
// (see lookupIsbn), so it produces a full UnifiedSearchResult in its own
// right and is filed under the same "OPENLIBRARY" source bucket — Books
// only has the one provider family from the UI's point of view.
export function normalizeGoogleBooksVolume(isbn: string, info: GoogleBooksVolumeInfo): UnifiedSearchResult {
  return {
    source: "OPENLIBRARY",
    externalId: `ISBN-${isbn}`,
    mediaType: "BOOK",
    title: info.title?.trim() || "Untitled",
    releaseDate: extractYear(info.publishedDate),
    coverUrl: info.imageLinks?.thumbnail?.replace(/^http:/, "https:") ?? null,
    overview: info.description?.trim() || null,
    genres: (info.categories ?? []).slice(0, 6),
    creator: info.authors?.[0] ?? null,
    isbn,
  };
}
