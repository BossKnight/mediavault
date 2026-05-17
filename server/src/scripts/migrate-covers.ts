// --- What is a "migration script"? ---
// A migration script is a one-off program you run manually to fix or transform
// existing data in the database. Unlike the main server (which runs forever),
// this script runs once, does its job, and exits.
//
// This particular script finds any items that still have an external cover URL
// (e.g. "https://image.tmdb.org/...") stored in the database, downloads those
// images to the local server, and updates the database to point at the local
// copy instead.
//
// Run it with:   npm run migrate:covers
// (from inside the server/ folder)

import dotenv from 'dotenv';
dotenv.config();   // must be first — loads .env before anything else reads it

import { db, initDb } from '../db';
import { downloadCover } from '../lib/download-cover';

async function run() {
  await initDb();

  // Find every item whose cover_path starts with "http" — these are external
  // URLs that haven't been downloaded to local storage yet.
  const result = await db.execute(
    "SELECT id, title, cover_path FROM items WHERE cover_path LIKE 'http%'"
  );

  if (result.rows.length === 0) {
    console.log('✓ All covers are already cached locally. Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${result.rows.length} item(s) with external cover URLs.\n`);

  let succeeded = 0;
  let failed    = 0;

  for (const row of result.rows) {
    const id    = row.id    as string;
    const title = row.title as string;
    const url   = row.cover_path as string;

    // For TMDB URLs, swap w500 for w185 so we cache the smaller size.
    // This is a plain string replace — safe to run on any URL, including
    // non-TMDB ones where "/w500/" simply won't be found.
    const downloadUrl = url.replace('/w500/', '/w185/');

    process.stdout.write(`  "${title}"  →  `);

    const localPath = await downloadCover(downloadUrl, id);

    if (localPath) {
      await db.execute({
        sql:  'UPDATE items SET cover_path = ? WHERE id = ?',
        args: [localPath, id],
      });
      console.log(`saved as ${localPath}`);
      succeeded++;
    } else {
      // Download failed — set cover_path to null so the UI shows a placeholder
      // rather than a broken image URL.
      await db.execute({
        sql:  'UPDATE items SET cover_path = NULL WHERE id = ?',
        args: [id],
      });
      console.log('download failed — cover cleared');
      failed++;
    }
  }

  console.log(`\nDone. ${succeeded} downloaded, ${failed} failed.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
