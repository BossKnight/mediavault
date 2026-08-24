// Pure functions that turn a raw TMDB or RAWG payload into a
// UnifiedSearchResult. Kept dependency-free (no fetch, no env access) so they
// are trivial to unit test.

import type { UnifiedSearchResult } from "@/types/media";
import type { RawgGame, TmdbMovieResult } from "./types";

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
    creator: game.developers?.[0]?.name ?? null,
  };
}
