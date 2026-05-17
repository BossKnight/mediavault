// --- What is an "API"? ---
// API stands for Application Programming Interface. It's a way for programs to
// talk to each other over the internet. When you search for a game, we don't
// store a database of every game ourselves — we ask RAWG (a game metadata site),
// a service that specialises in game data, to search for us.
//
// TMDB, RAWG, and Open Library are all external services that respond to our
// HTTP requests with JSON data. We act as a middleman: the frontend asks US
// to search, and we ask THEM on the frontend's behalf (so our API keys stay secret).

import { Router, Request, Response } from 'express';
import axios from 'axios';
import type { SearchResult, MovieMeta, GameMeta, BookMeta } from '../types';

const router = Router();

// ─── Search movies via TMDB ──────────────────────────────────────────────────
async function searchMovies(query: string): Promise<SearchResult[]> {
  if (!process.env.TMDB_API_KEY) throw new Error('TMDB_API_KEY is not set in server/.env');
  // TMDB supports two auth methods:
  //   ?api_key=<short_key>          — the v3 API Key (32 hex chars)
  //   Authorization: Bearer <token> — the Read Access Token (long JWT)
  // We use Bearer here so either token type works.
  const res = await axios.get('https://api.themoviedb.org/3/search/movie', {
    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
    params:  { query, include_adult: false },
  });
  return res.data.results.slice(0, 10).map((r: Record<string, unknown>): SearchResult => ({
    api_id:     String(r.id),
    api_source: 'tmdb',
    title:      r.title as string,
    year:       r.release_date ? parseInt((r.release_date as string).split('-')[0]) : null,
    cover_url:  r.poster_path ? `https://image.tmdb.org/t/p/w185${r.poster_path}` : null,
    genres:     [],
    meta:       { director: null, runtime_minutes: null, format: null } satisfies MovieMeta,
  }));
}

// ─── Search games via RAWG ───────────────────────────────────────────────────
// RAWG (rawg.io) is a free game database with 500,000+ titles.
// Unlike IGDB, it uses a simple API key — no OAuth or Twitch account needed.
// Get a free key at: https://rawg.io/apidocs (click "Get API Key")
async function searchGames(query: string): Promise<SearchResult[]> {
  if (!process.env.RAWG_API_KEY) throw new Error('RAWG_API_KEY is not set in server/.env');

  const res = await axios.get('https://api.rawg.io/api/games', {
    params: {
      key:       process.env.RAWG_API_KEY,
      search:    query,
      page_size: 10,
    },
  });

  return (res.data.results as Record<string, unknown>[]).map((r): SearchResult => {
    // RAWG wraps platforms as: [{ platform: { name: "PC" } }, ...]
    const platforms = (r.platforms as { platform: { name: string } }[] ?? [])
      .map(p => p.platform.name);
    const genres = (r.genres as { name: string }[] ?? []).map(g => g.name);
    const developers = (r.developers as { name: string }[] ?? []).map(d => d.name);

    return {
      api_id:     String(r.id),
      api_source: 'rawg',
      title:      r.name as string,
      year:       r.released ? parseInt((r.released as string).split('-')[0]) : null,
      cover_url:  (r.background_image as string | null) ?? null,
      genres,
      meta: {
        platform:  platforms[0] ?? null,
        developer: developers[0] ?? null,
        publisher: null,
      } satisfies GameMeta,
    };
  });
}

// ─── Search books via Open Library ──────────────────────────────────────────
async function searchBooks(query: string): Promise<SearchResult[]> {
  const res = await axios.get('https://openlibrary.org/search.json', {
    params: {
      q:      query,
      fields: 'key,title,author_name,first_publish_year,cover_i,subject,isbn,number_of_pages_median',
      limit:  10,
    },
  });
  return (res.data.docs as Record<string, unknown>[]).map((r): SearchResult => ({
    api_id:     r.key as string,
    api_source: 'openlibrary',
    title:      r.title as string,
    year:       (r.first_publish_year as number | null) ?? null,
    cover_url:  r.cover_i ? `https://covers.openlibrary.org/b/id/${r.cover_i}-L.jpg` : null,
    genres:     ((r.subject as string[] | undefined) ?? []).slice(0, 5),
    meta: {
      authors:    (r.author_name as string[] | undefined) ?? [],
      isbn:       ((r.isbn as string[] | undefined) ?? [])[0] ?? null,
      publisher:  null,
      page_count: (r.number_of_pages_median as number | null) ?? null,
    } satisfies BookMeta,
  }));
}

// ─── GET /lookup/search?type=movie|game|book&q=query ────────────────────────
router.get('/search', async (req: Request, res: Response) => {
  const { type, q } = req.query as Record<string, string>;

  if (!type || !q) return res.status(400).json({ message: 'type and q are required' });

  try {
    let results: SearchResult[] = [];
    if      (type === 'movie') results = await searchMovies(q);
    else if (type === 'game')  results = await searchGames(q);
    else if (type === 'book')  results = await searchBooks(q);
    else return res.status(400).json({ message: 'type must be movie, game, or book' });
    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    res.status(502).json({ message });
  }
});

export default router;
