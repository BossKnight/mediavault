// --- What is a "route"? ---
// A route is a URL path that your server responds to.
// When the frontend says "give me all my movies", it sends an HTTP request to
// a specific URL like GET /items?type=movie. This file defines how the server
// handles that request.
//
// HTTP has different "methods" that describe the intent:
//   GET    → read data     (safe, no side effects)
//   POST   → create data   (adds a new item)
//   PUT    → update data   (changes an existing item)
//   DELETE → remove data

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { downloadCover } from '../lib/download-cover';
import type { Item, BaseItem, MovieMeta, GameMeta, BookMeta, MediaType, OwnedStatus, ConsumedStatus } from '../types';

const router = Router();

// This SQL query fetches an item AND its type-specific metadata in one go.
// LEFT JOIN means: "also bring in data from movie_meta/game_meta/book_meta if it exists".
const JOIN_QUERY = `
  SELECT
    i.*,
    mm.director, mm.runtime_minutes, mm.format,
    gm.platform, gm.developer, gm.publisher,
    bm.authors, bm.isbn, bm.publisher AS book_publisher, bm.page_count
  FROM items i
  LEFT JOIN movie_meta mm ON i.id = mm.item_id
  LEFT JOIN game_meta  gm ON i.id = gm.item_id
  LEFT JOIN book_meta  bm ON i.id = bm.item_id
`;

// Converts a raw database row into a properly typed Item object.
function rowToItem(row: Record<string, unknown>): Item {
  const base: BaseItem = {
    id:               row.id as string,
    type:             row.type as MediaType,
    title:            row.title as string,
    year:             row.year as number | null,
    cover_path:       row.cover_path as string | null,
    genres:           JSON.parse((row.genres as string) || '[]'),
    status_owned:     row.status_owned as OwnedStatus,
    status_consumed:  row.status_consumed as ConsumedStatus | null,
    rating:           row.rating as number | null,
    api_id:           row.api_id as string,
    api_source:       row.api_source as BaseItem['api_source'],
    created_at:       row.created_at as string,
    updated_at:       row.updated_at as string,
  };

  if (base.type === 'movie') {
    const meta: MovieMeta = { director: row.director as string | null, runtime_minutes: row.runtime_minutes as number | null, format: row.format as string | null };
    return { ...base, type: 'movie', meta };
  }
  if (base.type === 'game') {
    const meta: GameMeta = { platform: row.platform as string | null, developer: row.developer as string | null, publisher: row.publisher as string | null };
    return { ...base, type: 'game', meta };
  }
  const meta: BookMeta = {
    authors:    JSON.parse((row.authors as string) || '[]'),
    isbn:       row.isbn as string | null,
    publisher:  (row.book_publisher ?? row.publisher) as string | null,
    page_count: row.page_count as number | null,
  };
  return { ...base, type: 'book', meta };
}

// ─── GET /items ──────────────────────────────────────────────────────────────
// Returns all items, with optional filters.
// Example: GET /items?type=movie&status_owned=owned
router.get('/', async (req: Request, res: Response) => {
  const { type, status_owned, status_consumed, genre, q } = req.query as Record<string, string>;

  let sql = JOIN_QUERY + ' WHERE 1=1';
  const args: Array<string | number | null> = [];

  if (type)             { sql += ' AND i.type = ?';            args.push(type); }
  if (status_owned)     { sql += ' AND i.status_owned = ?';    args.push(status_owned); }
  if (status_consumed)  { sql += ' AND i.status_consumed = ?'; args.push(status_consumed); }
  if (genre)            { sql += ' AND i.genres LIKE ?';       args.push(`%"${genre}"%`); }
  if (q)                { sql += ' AND i.title LIKE ?';        args.push(`%${q}%`); }

  sql += ' ORDER BY i.created_at DESC';

  const result = await db.execute({ sql, args });
  res.json(result.rows.map(r => rowToItem(r as Record<string, unknown>)));
});

// ─── GET /items/duplicate-check ──────────────────────────────────────────────
// Checks whether an item already exists before adding it.
// Must be defined BEFORE /:id so Express doesn't treat "duplicate-check" as an ID.
router.get('/duplicate-check', async (req: Request, res: Response) => {
  const { api_id, api_source, title, year, type, platform } = req.query as Record<string, string>;

  // Primary: same API identifier → definite duplicate.
  if (api_id && api_source) {
    const r = await db.execute({
      sql: JOIN_QUERY + ' WHERE i.api_id = ? AND i.api_source = ?',
      args: [api_id, api_source],
    });
    if (r.rows.length > 0) return res.json(rowToItem(r.rows[0] as Record<string, unknown>));
  }

  // Secondary: same title + year + type (+ platform for games).
  if (title && year && type) {
    let sql = JOIN_QUERY + ' WHERE LOWER(i.title) = LOWER(?) AND i.year = ? AND i.type = ?';
    const args: Array<string | number | null> = [title, parseInt(year), type];
    if (type === 'game' && platform) { sql += ' AND gm.platform = ?'; args.push(platform); }

    const r = await db.execute({ sql, args });
    if (r.rows.length > 0) return res.json(rowToItem(r.rows[0] as Record<string, unknown>));
  }

  res.status(404).json({ message: 'No duplicate found' });
});

// ─── GET /items/:id ──────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const itemId = req.params.id as string;
  const result = await db.execute({ sql: JOIN_QUERY + ' WHERE i.id = ?', args: [itemId] });
  if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
  res.json(rowToItem(result.rows[0] as Record<string, unknown>));
});

// ─── POST /items ─────────────────────────────────────────────────────────────
// Creates a new item. The body (JSON) must include all required fields.
router.post('/', async (req: Request, res: Response) => {
  const { type, title, year, cover_path, genres, status_owned, status_consumed,
          rating, api_id, api_source, meta } = req.body;

  if (!type || !title || !api_id || !api_source) {
    return res.status(400).json({ message: 'type, title, api_id, and api_source are required' });
  }

  const id  = uuidv4();
  const now = new Date().toISOString();

  // If the frontend sent an external URL (https://image.tmdb.org/...), download
  // it to our server now. If the download fails, localCoverPath will be null and
  // the item is still saved — just without a cover image.
  const rawCover: string | null = cover_path ?? null;
  const localCoverPath = rawCover?.startsWith('http')
    ? await downloadCover(rawCover, id)
    : rawCover;

  await db.execute({
    sql: `INSERT INTO items
          (id, type, title, year, cover_path, genres, status_owned, status_consumed,
           rating, api_id, api_source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, type, title, year ?? null, localCoverPath,
      JSON.stringify(genres ?? []),
      status_owned ?? 'owned',
      status_consumed ?? (status_owned === 'owned' ? 'not_yet' : null),
      rating ?? null, api_id, api_source, now, now,
    ],
  });

  if (type === 'movie') {
    await db.execute({ sql: 'INSERT INTO movie_meta (item_id, director, runtime_minutes, format) VALUES (?, ?, ?, ?)', args: [id, meta?.director ?? null, meta?.runtime_minutes ?? null, meta?.format ?? null] });
  } else if (type === 'game') {
    await db.execute({ sql: 'INSERT INTO game_meta (item_id, platform, developer, publisher) VALUES (?, ?, ?, ?)', args: [id, meta?.platform ?? null, meta?.developer ?? null, meta?.publisher ?? null] });
  } else if (type === 'book') {
    await db.execute({ sql: 'INSERT INTO book_meta (item_id, authors, isbn, publisher, page_count) VALUES (?, ?, ?, ?, ?)', args: [id, JSON.stringify(meta?.authors ?? []), meta?.isbn ?? null, meta?.publisher ?? null, meta?.page_count ?? null] });
  }

  const created = await db.execute({ sql: JOIN_QUERY + ' WHERE i.id = ?', args: [id] });
  res.status(201).json(rowToItem(created.rows[0] as Record<string, unknown>));
});

// ─── PUT /items/:id ──────────────────────────────────────────────────────────
// Updates an existing item. Only the fields you send will change.
router.put('/:id', async (req: Request, res: Response) => {
  const itemId = req.params.id as string;
  const existing = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [itemId] });
  if (existing.rows.length === 0) return res.status(404).json({ message: 'Item not found' });

  const e = existing.rows[0] as Record<string, unknown>;
  const b = req.body;
  const now = new Date().toISOString();

  await db.execute({
    sql: `UPDATE items SET title=?, year=?, cover_path=?, genres=?,
          status_owned=?, status_consumed=?, rating=?, updated_at=? WHERE id=?`,
    args: [
      b.title          ?? e.title,
      'year'           in b ? b.year           : e.year,
      'cover_path'     in b ? b.cover_path     : e.cover_path,
      'genres'         in b ? JSON.stringify(b.genres) : e.genres,
      b.status_owned   ?? e.status_owned,
      'status_consumed'in b ? b.status_consumed : e.status_consumed,
      'rating'         in b ? b.rating          : e.rating,
      now, itemId,
    ],
  });

  const type = e.type as string;
  if (b.meta) {
    if (type === 'movie') {
      await db.execute({ sql: 'UPDATE movie_meta SET director=COALESCE(?,director), runtime_minutes=COALESCE(?,runtime_minutes), format=? WHERE item_id=?', args: [b.meta.director ?? null, b.meta.runtime_minutes ?? null, b.meta.format ?? null, itemId] });
    } else if (type === 'game') {
      await db.execute({ sql: 'UPDATE game_meta SET platform=COALESCE(?,platform), developer=COALESCE(?,developer), publisher=COALESCE(?,publisher) WHERE item_id=?', args: [b.meta.platform ?? null, b.meta.developer ?? null, b.meta.publisher ?? null, itemId] });
    } else if (type === 'book') {
      await db.execute({ sql: 'UPDATE book_meta SET authors=COALESCE(?,authors), isbn=COALESCE(?,isbn), publisher=COALESCE(?,publisher), page_count=COALESCE(?,page_count) WHERE item_id=?', args: [b.meta.authors ? JSON.stringify(b.meta.authors) : null, b.meta.isbn ?? null, b.meta.publisher ?? null, b.meta.page_count ?? null, itemId] });
    }
  }

  const updated = await db.execute({ sql: JOIN_QUERY + ' WHERE i.id = ?', args: [itemId] });
  res.json(rowToItem(updated.rows[0] as Record<string, unknown>));
});

// ─── DELETE /items/:id ───────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const itemId = req.params.id as string;
  await db.execute({ sql: 'DELETE FROM movie_meta WHERE item_id = ?', args: [itemId] });
  await db.execute({ sql: 'DELETE FROM game_meta  WHERE item_id = ?', args: [itemId] });
  await db.execute({ sql: 'DELETE FROM book_meta  WHERE item_id = ?', args: [itemId] });
  const result = await db.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [itemId] });
  if (result.rowsAffected === 0) return res.status(404).json({ message: 'Item not found' });
  res.json({ message: 'Item deleted' });
});

export default router;
