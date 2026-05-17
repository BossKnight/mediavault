# Media Vault — Application Specification

## Overview

A mobile-first (iOS + Android) personal media cataloguing app for tracking movies, video games,
and books. Single user, no accounts.

**North star:** Speed of intake. Scan a barcode and the item is in the collection in under 3 seconds.

---

## Architecture

```
[Mobile App (React Native / Expo)]
        |
        | HTTP over Tailscale VPN
        |
[Self-hosted Backend (Node.js + Express + TypeScript)]
        |               |               |
    [SQLite DB]   [Image cache]   [External APIs]
                  (local disk)    TMDB / IGDB / Open Library
```

The mobile app **never** calls external APIs directly. All external API calls are proxied through
the self-hosted backend, which holds API keys in environment variables. The app connects to the
server via its Tailscale IP or hostname, meaning it works from anywhere the user has Tailscale
running on their phone.

---

## Tech Stack

### Frontend

| Concern | Choice |
|---|---|
| Framework | Expo SDK (React Native, TypeScript) |
| Barcode scanning | `react-native-vision-camera` + `vision-camera-code-scanner` |
| Local offline cache | `expo-sqlite` |
| Navigation | React Navigation — Bottom Tabs + Stack |
| Server state / cache | TanStack Query (React Query) |
| Server URL storage | `expo-secure-store` |

### Backend

| Concern | Choice |
|---|---|
| Runtime | Node.js (LTS) |
| Language | TypeScript |
| HTTP framework | Express.js |
| Database | `better-sqlite3` (SQLite, single file) |
| External HTTP | `axios` |
| Image storage | `axios` stream to disk |
| Config | `dotenv` |
| Process manager | PM2 (or Docker Compose) |

**Why Node.js + TypeScript for the backend?**
Shares a language and type definitions with the React Native frontend. Types for API response
shapes and item schemas can live in a shared `packages/types` workspace package, eliminating
an entire class of frontend/backend contract bugs. SQLite is sufficient for a personal
single-user collection and produces a single file that is trivial to back up.

---

## External API Integration

### TMDB (Movies)
- Base URL: `https://api.themoviedb.org/3`
- Auth: `?api_key=YOUR_KEY` (stored in server `.env`, never sent to client)
- Image base: `https://image.tmdb.org/t/p/w500`
- Barcode strategy: UPC → UPCitemdb for product name → TMDB title search

### IGDB (Games)
- Auth: Twitch client credentials flow (`POST https://id.twitch.tv/oauth2/token`)
- Access token expires every 60 days — backend auto-refreshes on receipt of a 401. Token and
  `expires_at` are persisted in the SQLite DB. Pre-emptive refresh occurs if expiry is within 7 days.
- Credentials (`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`) stored in `.env`
- Barcode strategy: UPC → UPCitemdb → product name → IGDB search
- Fields requested: `name, cover.url, genres.name, platforms.name, first_release_date, involved_companies.company.name`

### Open Library (Books)
- URL: `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data`
- ISBN-13 is embedded directly in book barcodes (EAN-13 prefix 978/979) — no intermediate
  lookup needed. This is the most reliable barcode-to-metadata path of the three media types.
- Fallback: Google Books `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}` for
  missing fields (cover, page count).

### UPCitemdb (Barcode resolution for movies and games)
- URL: `https://api.upcitemdb.com/prod/trial/lookup?upc={code}`
- Free tier: 100 requests/day. Sufficient for casual scanning sessions.
- Used only when the scanned barcode is **not** an ISBN. Resolves UPC to a product name, which
  is then used to search TMDB or IGDB.
- Successful UPC → metadata mappings are cached in the SQLite DB so re-scanning the same item
  never consumes a second API call.

---

## Data Model

All tables live in a single SQLite file at `$DATABASE_PATH` (configured via `.env`).

### `items` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `type` | TEXT | `'movie'` \| `'game'` \| `'book'` |
| `title` | TEXT | |
| `year` | INTEGER | Release year |
| `cover_path` | TEXT | Relative path, e.g. `images/abc-cover.jpg`. Nullable. |
| `genres` | TEXT | JSON array of strings, e.g. `["Action","RPG"]` |
| `status_owned` | TEXT | `'owned'` \| `'wishlist'` |
| `status_consumed` | TEXT | `'consumed'` \| `'not_yet'` \| `null` |
| `rating` | INTEGER | 1–5. Nullable. |
| `api_id` | TEXT | External identifier (TMDB id, IGDB id, OL work key, or UUID for manual) |
| `api_source` | TEXT | `'tmdb'` \| `'igdb'` \| `'openlibrary'` \| `'manual'` |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

`status_consumed` semantics:
- `null` — item is wishlisted (consumed state is meaningless until you own it)
- `'not_yet'` — owned but not yet watched/read/played
- `'consumed'` — finished

When a wishlist item is promoted to owned, `status_consumed` is automatically set to `'not_yet'`.

### `movie_meta` table (FK → `items.id`)

| Column | Type |
|---|---|
| `item_id` | TEXT (FK) |
| `director` | TEXT |
| `runtime_minutes` | INTEGER |

### `game_meta` table (FK → `items.id`)

| Column | Type | Notes |
|---|---|---|
| `item_id` | TEXT (FK) | |
| `platform` | TEXT | `'PS5'`, `'PC'`, `'Switch'`, `'Xbox Series X'`, etc. |
| `developer` | TEXT | |
| `publisher` | TEXT | |

**Games on multiple platforms are separate `items` rows.** Owning Elden Ring on PS5 and PC
produces two rows, each with its own `game_meta.platform`. This enables per-platform status
(e.g. completed on PC, not yet on PS5) and per-platform rating.

### `book_meta` table (FK → `items.id`)

| Column | Type |
|---|---|
| `item_id` | TEXT (FK) |
| `authors` | TEXT (JSON array) |
| `isbn` | TEXT |
| `publisher` | TEXT |
| `page_count` | INTEGER |

### `upc_cache` table

| Column | Type | Notes |
|---|---|---|
| `upc` | TEXT (PK) | The raw UPC/EAN scanned |
| `product_name` | TEXT | Name from UPCitemdb |
| `resolved_type` | TEXT | `'movie'` \| `'game'` \| `'book'` (inferred) |
| `cached_at` | TEXT | ISO 8601 |

Prevents duplicate UPCitemdb calls for the same barcode.

---

## User Flows

### Add via Barcode Scan

1. User taps the camera/scan button (present in all three tabs).
2. Full-screen camera view opens. The scanner runs continuously — no tap-to-scan.
3. On barcode decode: brief haptic feedback, camera pauses.
4. App sends the barcode to `POST /lookup/barcode?code={value}`.
5. Backend determines the lookup path:
   - ISBN prefix (978/979): Open Library direct lookup.
   - Otherwise: UPCitemdb → product name → TMDB or IGDB search (based on the tab the user
     is currently in).
6. **If resolved:** A preview card appears (cover, title, year, type-specific fields). User
   taps "Add" — item is saved. Camera resumes.
7. **If not found / ambiguous:** The backend returns whatever partial data it found (product
   name from UPCitemdb, year if available). A manual entry form opens pre-filled with this
   data. User fills in the gaps and saves.

### Add via Title Search

1. User taps `+` → "Search by title".
2. Search is scoped to the current tab's media type (Movies tab searches TMDB, etc.).
3. Results appear as a scrollable list with cover art and year.
4. Tapping a result shows the same preview card as barcode flow. User confirms → saved.

### Duplicate Detection

Before any save, the backend checks:

**Primary check** (definite duplicate): same `api_id` AND same `api_source`.  
**Secondary check** (probable duplicate): same `title` (case-insensitive) + same `year` +
same `type`. For games, also same `platform` (owning a game on two platforms is intentional,
not a duplicate).

If either check triggers, the app shows a modal:

> "This is already in your collection."  
> [View Existing]   [Add Anyway]

"Add Anyway" bypasses the check for that save only (covers edge cases like owning the same
film on DVD and Blu-ray as separate entries).

### Promote Wishlist → Owned

From the item detail screen: toggle the Owned/Wishlist chip. When toggled to Owned,
`status_consumed` is set to `'not_yet'` if it was previously `null`.

Alternatively, scanning the barcode of a wishlisted item triggers the duplicate modal with a
third option: "Mark as Owned" (sets `status_owned = 'owned'` on the existing record).

---

## Browse UX

Three bottom tabs: **Movies** | **Games** | **Books**

Each tab shows a cover-art grid by default. Controls at the top of each tab:

- **Search bar** — real-time title search against the local offline cache (no server round trip).
- **Filter bar** — collapsible row of chips:
  - Status: `All` | `Owned` | `Wishlist`
  - Consumed: `All` | `Not yet` | `Consumed`
  - Genre: multi-select, populated from genres present in the user's collection for that type.

Tapping a cover opens the item detail screen.

---

## Item Detail Screen

Shows all metadata. Editable fields:

- Title, year, genres
- Type-specific fields (director/runtime, platform/developer, authors/ISBN/page count)
- `status_owned` toggle (Owned / Wishlist)
- `status_consumed` toggle (Not yet / Consumed) — disabled when wishlisted
- Star rating (1–5, clearable)

No notes field. Rating is the only subjective input.

---

## Backend API Endpoints

### Items

| Method | Path | Description |
|---|---|---|
| `GET` | `/items` | List items. Query params: `type`, `status_owned`, `status_consumed`, `genre` (comma-separated), `q` (title search) |
| `POST` | `/items` | Create item. Body includes base fields + type-specific metadata. |
| `GET` | `/items/:id` | Single item with all metadata joined. |
| `PUT` | `/items/:id` | Update any fields. |
| `DELETE` | `/items/:id` | Delete item and its type-specific metadata row. |

### Lookup

| Method | Path | Description |
|---|---|---|
| `GET` | `/lookup/barcode?code=&type=` | Resolve a barcode. Returns metadata object or 404. |
| `GET` | `/lookup/search?type=&q=` | Search by title. Returns array of candidates. |

### Images

| Method | Path | Description |
|---|---|---|
| `GET` | `/images/:filename` | Serve a cached image from local disk. |

### Duplicate Check

| Method | Path | Description |
|---|---|---|
| `GET` | `/items/duplicate-check?api_id=&api_source=&title=&year=&type=&platform=` | Returns the existing item if a duplicate is found, or 404. |

---

## Image Caching

1. On item creation, the backend downloads the cover image from the API CDN.
2. Saved as `{item-uuid}-cover.jpg` inside `$IMAGES_DIR` on the server.
3. `items.cover_path` stores the relative path (e.g. `images/abc-cover.jpg`).
4. The mobile app loads covers via `GET /images/{filename}` — always through the server,
   never directly from external CDNs.
5. If the download fails at creation time: `cover_path` is set to `null`; the app renders a
   per-type placeholder silhouette (film reel / gamepad / book).
6. No automatic cleanup in v1. Disk usage grows unboundedly with collection size. Document
   this and address in v2.

---

## Offline Mode

The app maintains a local SQLite cache (`expo-sqlite`) of the full collection.

**Sync triggers:**
- On app foreground (if server is reachable).
- After any successful create/update/delete.

**When the server is unreachable:**
- A persistent banner appears: "Offline — collection is read-only."
- All add/edit/delete buttons are disabled.
- Browse, search, and filter work normally from the local cache.
- Cover images may not load (they are served by the server). Placeholder is shown instead.

**On reconnect:**
- First successful server response dismisses the banner.
- App triggers a full sync automatically.

No offline write queueing in v1. No conflict resolution is needed.

---

## Server Configuration (`.env`)

```env
PORT=3000
DATABASE_PATH=./data/vault.db
IMAGES_DIR=./data/images

TMDB_API_KEY=your_tmdb_key
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# optional — leave as 'trial' for free tier (100 req/day)
UPCITEMDB_KEY=trial
```

The server should be started with PM2 or via Docker Compose so it survives reboots. A daily
cron job backing up `vault.db` to a secondary location is strongly recommended:

```
0 3 * * * cp /path/to/vault.db /path/to/backups/vault-$(date +\%Y\%m\%d).db
```

---

## Known Risks & Tradeoffs

### Barcode resolution for movies and games is best-effort

UPC codes for movies and games do not encode a TMDB or IGDB identifier. The resolution chain
(UPC → UPCitemdb → product name → API title search) can return wrong results, especially for:
- Foreign regional releases with different titles
- Re-releases and GOTY editions that share a UPC with the original
- Obscure titles not indexed by UPCitemdb

**Mitigation:** Always show a preview card before saving. The user confirms the match. If it is
wrong, the manual entry form pre-fills with whatever data was found.

### UPCitemdb free tier cap

100 UPC lookups/day. A session cataloguing an entire shelf could hit this. Successful lookups
are cached in `upc_cache` so re-scanning a previously seen barcode never consumes a call.

**Mitigation for heavy use:** Upgrade to a paid UPCitemdb plan, or integrate a second barcode
database as fallback (e.g. `go-upc.com`).

### Image storage grows unboundedly

At ~50KB per cover: 1,000 items ≈ 50MB, 5,000 items ≈ 250MB. Manageable on most hardware but
no cleanup exists in v1.

**Mitigation:** Document the growth rate. Add a "Clean up unused images" tool in v2.

### Tailscale is a dependency

If Tailscale is down or the phone has no internet, the app becomes read-only. This is an
accepted tradeoff for the self-hosted model. Document the Tailscale setup requirement clearly
in the onboarding README.

### IGDB token rotation

If the server is unrestarted for 60+ days and no game lookups have occurred in that window, the
Twitch token may expire without being automatically refreshed. The refresh logic should also
run on server startup.

---

## Out of Scope (v1)

- User accounts / authentication
- Multi-user or household sharing
- Social features
- CSV/JSON export
- Personal notes or review text (5-star rating only)
- Wishlist priority ordering or price tracking
- Push notifications
- In-app image storage cleanup tooling
- Import from Letterboxd, Goodreads, or other services
