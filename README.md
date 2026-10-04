# MediaVault

Keep your movies, TV shows, games, and books in one vault. Search TMDB, RAWG, and Open
Library to add titles — or scan a barcode — then track status, rating, and progress per user.

See [`SPEC.md`](./SPEC.md) for the original single-user, self-hosted concept this app grew out
of; this app is the multi-user, cloud-backed rebuild described below.

## Features

- **Vault** — movies, TV shows, games, and books, each with per-user status, rating, notes,
  and progress (seasons owned, hours played, and so on).
- **Wishlist** — track what you want to own separately from what you already do, on its own
  page; move an item to your vault from its detail view whenever you pick it up.
- **Recommendations** — a "try next" strip on the vault page suggests plan-to-watch titles in
  the genres you rate highest.
- **Barcode / ISBN scanning** — scan a book's ISBN, or a movie/TV/game's barcode, with your
  phone or webcam (or just type the number in) to add it without searching by title.

## Stack

- **Frontend / backend:** Next.js (App Router, TypeScript), Tailwind CSS
- **Database:** PostgreSQL via Prisma
- **Auth:** NextAuth (Auth.js) with email/password credentials
- **External metadata:** [TMDB](https://www.themoviedb.org/documentation/api) (movies & TV),
  [RAWG](https://rawg.io/apidocs) (games), [Open Library](https://openlibrary.org/developers/api)
  (books). Barcode scanning also draws on [UPCitemdb](https://www.upcitemdb.com/wp/docs/main/)
  (movie/TV/game UPCs) and [Google Books](https://developers.google.com/books) (backfills a
  book's cover or description when Open Library is missing one).

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — a PostgreSQL connection string
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `TMDB_API_KEY` — a free v3 API key from [TMDB](https://www.themoviedb.org/settings/api)
   - `RAWG_API_KEY` — a free key from [RAWG](https://rawg.io/apidocs)
   - `GOOGLE_BOOKS_API_KEY` *(optional)* — raises Google Books' unauthenticated rate limit; it's
     only used to back-fill a cover or description Open Library is missing for a scanned book.
     Books themselves need no key (Open Library), and neither does UPCitemdb's free trial tier
     that powers movie/TV/game barcode lookups — both work out of the box.

3. Apply the database schema:

   ```bash
   npm run prisma:migrate
   ```

4. (Optional) Seed a demo account:

   ```bash
   npm run prisma:seed
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run the test suite |
| `npm run prisma:migrate` | Apply migrations in development (and create new ones) |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm run prisma:studio` | Browse the database |

## Project structure

- `app/` — routes, layouts, and API route handlers
- `features/` — feature-specific components (catalog discovery, item detail, wishlist, auth
  forms, shared navigation)
- `components/ui/` — shared, reusable UI primitives
- `lib/` — utilities, Prisma client, auth config, and the external API service layer
- `types/` — shared TypeScript types
- `prisma/` — database schema, migrations and seed script

## Copies

Each vault entry holds the copies owned, in the `Copy` table: a format or platform, an optional
edition, and for a TV show, the seasons that copy holds. A movie on Blu-Ray (Collector's Edition)
and 4K UHD (Anniversary Edition) is one entry with two copies, as is a show with season 4 on
Blu-Ray and season 5 on DVD. An entry's formats and seasons owned are worked out from its copies
(`lib/copies.ts`).

Entries saved before copies existed keep their older `platforms` / `platform` / `ownedSeasons` /
`completeSeries` values, which are read as copies until the entry is next saved; saving writes
real copies and clears the older fields. One case can't be read exactly: a show with seasons
recorded and several formats, where there's no telling which copy holds which seasons. Those
seasons go on the first copy, and the entry is flagged (`seasonsNeedReview`) for the user to check.

## Migrations

Migrations are committed in `prisma/migrations`, starting from a baseline (`0_init`) of the
schema as it stood before copies. A new database gets everything from `npm run prisma:migrate`
(development) or `npm run prisma:deploy` (production).

### Upgrading an existing database

Databases created before migrations were committed already have the baseline's tables. Tell
Prisma so, then apply the rest:

```bash
npx prisma migrate resolve --applied 0_init
npm run prisma:deploy
```

In development, `npm run prisma:migrate` will then list your old, locally generated migrations
as "missing from the local migrations directory" and offer to reset the database. Don't: remove
their records instead (the baseline covers the same schema), and it carries on normally:

```sql
DELETE FROM "_prisma_migrations" WHERE migration_name NOT IN ('0_init', '20261004000000_copies');
```

## Title details

A title's shared details (name, cover, overview, genres, creator) come from its provider (TMDB,
RAWG or Open Library), fetched by the server, not from what the browser sends. If the provider
can't be reached or isn't configured when a new title is added, the search result is used
instead, and only for that new title. A title is re-fetched when someone adds it after 30 days,
or on demand with **Refresh details** in its dialog (rate limited per user).

### Upgrading: titles are keyed by media type

TMDB numbers movies and TV shows separately, so a title is now identified by source, media type
and id (`@@unique([source, mediaType, externalId])`). After pulling this change, run
`npm run prisma:migrate`. Prisma warns that adding a unique constraint fails if duplicates
exist; answer yes. None can exist, since the old key (source and id only) was stricter.

## Rate limiting

Sign-up, sign-in, barcode lookups, and title refreshes are rate limited (see `lib/rate-limit.ts`). Counts live
in the `RateLimit` table, so they're shared across every app instance; after pulling this
change, run `npm run prisma:migrate` to create it.

Sign-up and sign-in limits are per client IP, read from the last `X-Forwarded-For` entry. Run
the app behind a reverse proxy or host (Vercel, nginx, Caddy) that sets that header: without
one, clients can send any value and sidestep the per-IP limits.
