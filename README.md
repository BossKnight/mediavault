# MediaVault

Catalog your movies, TV shows, and games in one place. Search TMDB and RAWG to add titles,
then track status, rating, and progress per user.

See [`SPEC.md`](./SPEC.md) for the original single-user, self-hosted concept this app grew out
of; this app is the multi-user, cloud-backed rebuild described below.

## Stack

- **Frontend / backend:** Next.js (App Router, TypeScript), Tailwind CSS
- **Database:** PostgreSQL via Prisma
- **Auth:** NextAuth (Auth.js) with email/password credentials
- **External metadata:** [TMDB](https://www.themoviedb.org/documentation/api) (movies & TV),
  [RAWG](https://rawg.io/apidocs) (games)

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
- `features/` — feature-specific components (catalog discovery, item detail, auth forms)
- `components/ui/` — shared, reusable UI primitives
- `lib/` — utilities, Prisma client, auth config, and the external API service layer
- `types/` — shared TypeScript types
- `prisma/` — database schema and seed script
