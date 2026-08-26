// Server-only catalog/wishlist list queries: pagination, filtering, and
// sorting all happen here in Prisma, not in the client — the alternative
// (fetch everything, filter/sort in the browser) doesn't hold up once a
// collection reaches the hundreds or thousands of items this product's own
// "collectors" audience is expected to reach. Shared between the API route
// (client-driven fetches: filter changes, "load more") and the server page
// components (first paint), so both build the exact same query.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { catalogEntryInclude, computeStats, toCatalogEntry } from "@/lib/catalog";
import type {
  CatalogSort,
  CatalogStats,
  MediaType,
  OwnershipStatus,
  WatchStatus,
} from "@/types/media";

/** One grid's worth at the widest breakpoint (6 columns) times 10 rows. */
export const CATALOG_PAGE_SIZE = 60;

export interface CatalogQueryParams {
  ownership: OwnershipStatus;
  status?: WatchStatus;
  mediaType?: MediaType;
  q?: string;
  sort?: CatalogSort;
}

function buildWhere(userId: string, params: CatalogQueryParams): Prisma.UserMediaProgressWhereInput {
  const where: Prisma.UserMediaProgressWhereInput = { userId, ownership: params.ownership };
  if (params.status) {
    where.status = params.status;
  }

  const mediaItemWhere: Prisma.MediaItemWhereInput = {};
  if (params.mediaType) {
    mediaItemWhere.mediaType = params.mediaType;
  }
  if (params.q) {
    mediaItemWhere.title = { contains: params.q, mode: "insensitive" };
  }
  if (Object.keys(mediaItemWhere).length > 0) {
    where.mediaItem = mediaItemWhere;
  }

  return where;
}

// Every branch ends with `id` as a tiebreaker, which is also what makes
// cursor pagination correct here: Prisma's `cursor: { id }, skip: 1`
// resumes "immediately after this row" according to whatever `orderBy` is
// passed alongside it, so a single unique id is enough to page through
// any of these orders correctly, without needing a compound cursor.
function buildOrderBy(sort: CatalogSort = "recent"): Prisma.UserMediaProgressOrderByWithRelationInput[] {
  switch (sort) {
    case "title":
      return [{ mediaItem: { title: "asc" } }, { id: "asc" }];
    case "rating":
      return [{ rating: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "recent":
    default:
      // createdAt, not updatedAt — "recent" means "recently added," and
      // shouldn't reorder just because an existing item's rating or
      // status was edited.
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

export interface CatalogPage {
  entries: ReturnType<typeof toCatalogEntry>[];
  nextCursor: string | null;
}

/**
 * Fetches one page of catalog/wishlist entries. Pass the previous page's
 * `nextCursor` to continue; omit it for the first page.
 */
export async function fetchCatalogPage(
  userId: string,
  params: CatalogQueryParams,
  cursor?: string,
): Promise<CatalogPage> {
  const rows = await prisma.userMediaProgress.findMany({
    where: buildWhere(userId, params),
    include: catalogEntryInclude,
    orderBy: buildOrderBy(params.sort),
    take: CATALOG_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > CATALOG_PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, CATALOG_PAGE_SIZE) : rows;

  return {
    entries: pageRows.map(toCatalogEntry),
    nextCursor: hasMore ? pageRows[pageRows.length - 1]!.id : null,
  };
}

/**
 * Aggregate stats for the whole owned/wishlist collection, independent of
 * pagination, filters, or sort — so the stat panel's counts are always the
 * true totals, not just whatever page happens to be loaded. Selects only
 * the three fields computeStats actually reads, which keeps this cheap
 * even at a few thousand rows (no cover art, overview, or genre text).
 */
export async function fetchCatalogStats(userId: string, ownership: OwnershipStatus): Promise<CatalogStats> {
  const rows = await prisma.userMediaProgress.findMany({
    where: { userId, ownership },
    select: { status: true, rating: true, mediaItem: { select: { mediaType: true } } },
  });

  return computeStats(
    rows.map((row) => ({
      status: row.status as WatchStatus,
      rating: row.rating,
      mediaItem: { mediaType: row.mediaItem.mediaType as MediaType },
    })),
  );
}
