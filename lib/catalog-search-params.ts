// Shared, framework-agnostic query-param parsing for the catalog/wishlist
// list endpoints — used by both the server page components (reading Next's
// `searchParams`) and the client views (reading `useSearchParams()`), so
// the two can never silently drift on what counts as a valid value. Each
// function returns `undefined` for a missing or invalid value rather than
// a UI-only sentinel like "ALL", since these feed straight into building a
// fetch request.

import type { CatalogSort, MediaType, WatchStatus } from "@/types/media";

const MEDIA_TYPES: MediaType[] = ["MOVIE", "TV", "GAME", "BOOK"];
const WATCH_STATUSES: WatchStatus[] = [
  "PLAN_TO_WATCH",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];
const SORTS: CatalogSort[] = ["recent", "title", "rating"];

export function readMediaTypeParam(value: string | null | undefined): MediaType | undefined {
  return MEDIA_TYPES.includes(value as MediaType) ? (value as MediaType) : undefined;
}

export function readStatusParam(value: string | null | undefined): WatchStatus | undefined {
  return WATCH_STATUSES.includes(value as WatchStatus) ? (value as WatchStatus) : undefined;
}

export function readSortParam(value: string | null | undefined): CatalogSort {
  return SORTS.includes(value as CatalogSort) ? (value as CatalogSort) : "recent";
}
