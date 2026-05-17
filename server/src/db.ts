// --- What is a database? ---
// A database is a program that stores data permanently. Unlike variables in your
// code (which disappear when the program stops), a database persists data to disk.
//
// We're using SQLite — a database that lives in a single file on your hard drive.
// It's perfect for personal apps because you don't need to install a separate
// database server. The file IS the database.
//
// We communicate with SQLite using SQL (Structured Query Language) — a special
// language for describing what data you want:
//   SELECT * FROM items WHERE type = 'movie'  ← "give me all movies"
//   INSERT INTO items (title) VALUES ('Dune')  ← "add this item"

import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Make sure the data directory exists before we try to create the database inside it.
const dataDir = path.dirname(path.resolve(process.env.DATABASE_PATH ?? './data/vault.db'));
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// createClient opens (or creates) the SQLite database file.
// The 'file:' prefix tells libsql to use a local file, not a remote server.
const dbPath = path.resolve(process.env.DATABASE_PATH ?? './data/vault.db');

// pathToFileURL converts a Windows path (C:\...) to a proper file:/// URL
// that @libsql/client understands on all platforms.
export const db = createClient({
  url: pathToFileURL(dbPath).href,
});

// initDb creates our tables if they don't already exist.
// SQL "CREATE TABLE IF NOT EXISTS" is safe to run every time the server starts —
// it only creates the table if it isn't there yet.
export async function initDb(): Promise<void> {
  // The main table — one row per item in your collection.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id             TEXT PRIMARY KEY,
      type           TEXT NOT NULL CHECK(type IN ('movie', 'game', 'book')),
      title          TEXT NOT NULL,
      year           INTEGER,
      cover_path     TEXT,
      genres         TEXT NOT NULL DEFAULT '[]',
      status_owned   TEXT NOT NULL DEFAULT 'owned'
                       CHECK(status_owned IN ('owned', 'wishlist')),
      status_consumed TEXT
                       CHECK(status_consumed IN ('consumed', 'not_yet')),
      rating         INTEGER CHECK(rating BETWEEN 1 AND 5),
      api_id         TEXT NOT NULL,
      api_source     TEXT NOT NULL,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    )
  `);

  // Extra fields that only movies have.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS movie_meta (
      item_id         TEXT PRIMARY KEY,
      director        TEXT,
      runtime_minutes INTEGER
    )
  `);

  // Extra fields that only games have.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS game_meta (
      item_id   TEXT PRIMARY KEY,
      platform  TEXT,
      developer TEXT,
      publisher TEXT
    )
  `);

  // Extra fields that only books have.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS book_meta (
      item_id    TEXT PRIMARY KEY,
      authors    TEXT NOT NULL DEFAULT '[]',
      isbn       TEXT,
      publisher  TEXT,
      page_count INTEGER
    )
  `);

  // ALTER TABLE adds a column to a table that already exists.
  // SQLite doesn't support "ADD COLUMN IF NOT EXISTS", so we catch the error
  // that fires when the column is already there — that error is safe to ignore.
  try {
    await db.execute('ALTER TABLE movie_meta ADD COLUMN format TEXT');
  } catch {
    // Column already exists — nothing to do.
  }

  console.log(`✓ Database ready: ${dbPath}`);
}
