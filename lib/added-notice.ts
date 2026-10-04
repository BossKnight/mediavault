import type { CatalogEntry, MediaType, OwnershipStatus, WatchStatus } from "@/types/media";

export const LIST_NAMES: Record<OwnershipStatus, string> = { OWNED: "vault", WISHLIST: "wishlist" };

/** A title to confirm, with its year when that's needed to tell it apart. */
export type NoticeTitle = string | { title: string; year: string };

/**
 * Confirms one or more items just added to a list: their titles for one or
 * two, a count beyond that.
 */
export function addedNoticeMessage(titles: NoticeTitle[], ownership: OwnershipStatus): string {
  const list = LIST_NAMES[ownership];
  if (titles.length > 2) return `Added ${titles.length} items to your ${list}.`;
  const named = titles.map((item) =>
    typeof item === "string" ? `“${item}”` : `“${item.title}” (${item.year})`,
  );
  return `Added ${named.join(" and ")} to your ${list}.`;
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

/**
 * Titles for a notice, with the year added where two entries share a title
 * (an original and its remake), so the message can tell them apart.
 */
export function distinctTitles(entries: CatalogEntry[]): NoticeTitle[] {
  const counts = new Map<string, number>();
  for (const { mediaItem } of entries) {
    counts.set(mediaItem.title, (counts.get(mediaItem.title) ?? 0) + 1);
  }
  return entries.map(({ mediaItem: { title, releaseDate } }) => {
    const year = releaseDate?.slice(0, 4);
    return (counts.get(title) ?? 0) > 1 && year ? { title, year } : title;
  });
}

export function listNoticeMessage(notice: ListNotice): string {
  if (notice.kind === "moved") return notice.message;
  return addedNoticeMessage(distinctTitles(notice.entries), notice.ownership);
}

/** Ids of entries a list should highlight: ones just added to that list. */
export function highlightedEntryIds(notice: ListNotice | null, list: OwnershipStatus): Set<string> {
  if (notice?.kind !== "added" || notice.ownership !== list) return new Set();
  return new Set(notice.entries.map((entry) => entry.id));
}
