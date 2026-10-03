import type { CatalogEntry, MediaType, OwnershipStatus, WatchStatus } from "@/types/media";

export const LIST_NAMES: Record<OwnershipStatus, string> = { OWNED: "vault", WISHLIST: "wishlist" };

/**
 * Confirms one or more items just added to a list: their titles for one or
 * two, a count beyond that.
 */
export function addedNoticeMessage(titles: string[], ownership: OwnershipStatus): string {
  const list = LIST_NAMES[ownership];
  if (titles.length > 2) return `Added ${titles.length} items to your ${list}.`;
  return `Added ${titles.map((title) => `“${title}”`).join(" and ")} to your ${list}.`;
}

export interface ListFilters {
  q?: string;
  mediaType?: "ALL" | MediaType;
  status?: "ALL" | WatchStatus;
}

/**
 * Whether the list's current filters show `entry`, mirroring the server's
 * rules (lib/catalog-query.ts): the search matches the title, ignoring case.
 */
export function entryMatchesFilters(
  entry: CatalogEntry,
  { q, mediaType = "ALL", status = "ALL" }: ListFilters,
): boolean {
  const query = q?.trim().toLowerCase();
  if (query && !entry.mediaItem.title.toLowerCase().includes(query)) return false;
  if (mediaType !== "ALL" && entry.mediaItem.mediaType !== mediaType) return false;
  if (status !== "ALL" && entry.status !== status) return false;
  return true;
}

/**
 * The notice above a list: items just added (consecutive adds to the same
 * list are confirmed together until dismissed), or an item that moved.
 */
export type ListNotice =
  | { kind: "added"; ownership: OwnershipStatus; entries: CatalogEntry[] }
  | { kind: "moved"; message: string; elsewhere: boolean };

export function withAddedEntry(notice: ListNotice | null, entry: CatalogEntry): ListNotice {
  if (notice?.kind === "added" && notice.ownership === entry.ownership) {
    return { ...notice, entries: [...notice.entries, entry] };
  }
  return { kind: "added", ownership: entry.ownership, entries: [entry] };
}

export function listNoticeMessage(notice: ListNotice): string {
  if (notice.kind === "moved") return notice.message;
  return addedNoticeMessage(
    notice.entries.map((entry) => entry.mediaItem.title),
    notice.ownership,
  );
}

/** Ids of entries a list should highlight: ones just added to that list. */
export function highlightedEntryIds(notice: ListNotice | null, list: OwnershipStatus): Set<string> {
  if (notice?.kind !== "added" || notice.ownership !== list) return new Set();
  return new Set(notice.entries.map((entry) => entry.id));
}
