# MediaVault

Catalog your movies, TV shows, games, and books in one place. Search TMDB, RAWG, and Open
Library to add titles — or scan a barcode — then track status, rating, and progress per user.

See [`SPEC.md`](./SPEC.md) for the original single-user, self-hosted concept this app grew out
of; this app is the multi-user, cloud-backed rebuild described below.

## Features

- **Catalog** — movies, TV shows, games, and books, each with per-user status, rating, notes,
  and progress (seasons owned, hours played, and so on).
- **Wishlist** — track what you want to own separately from what you already do, on its own
  page; promote an item to your catalog in one click whenever you pick it up.
- **Recommendations** — a "try next" strip on the catalog page suggests plan-to-watch titles in
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
| `npm run prisma:migrate` | Apply schema migrations |
| `npm run prisma:studio` | Browse the database |

## Project structure

- `app/` — routes, layouts, and API route handlers
- `features/` — feature-specific components (catalog discovery, item detail, wishlist, auth
  forms, shared navigation)
- `components/ui/` — shared, reusable UI primitives
- `lib/` — utilities, Prisma client, auth config, and the external API service layer
- `types/` — shared TypeScript types
- `prisma/` — database schema and seed script
