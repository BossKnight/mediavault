import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { MAX_PLATFORMS, MAX_PLATFORM_LENGTH, normalizePlatforms } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { catalogEntryInclude, toCatalogEntry } from "@/lib/catalog";
import { cleanCopies, copiesInputSchema, legacyCopies } from "@/lib/copies";
import { fetchCatalogPage, type CatalogQueryParams } from "@/lib/catalog-query";
import { readMediaTypeParam, readSortParam, readStatusParam } from "@/lib/catalog-params";
import { lookupMediaDetails } from "@/lib/external-apis";
import {
  isMetadataStale,
  metadataCreateData,
  PROVIDER_NAMES,
  refreshMediaItem,
} from "@/lib/media-metadata";
import type { UnifiedSearchResult } from "@/types/media";

const createCatalogSchema = z.object({
  source: z.enum(["TMDB", "RAWG", "OPENLIBRARY"]),
  externalId: z.string().min(1),
  mediaType: z.enum(["MOVIE", "TV", "GAME", "BOOK"]),
  title: z.string().min(1),
  releaseDate: z.string().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  overview: z.string().nullable().optional(),
  genres: z.array(z.string()).optional(),
  creator: z.string().nullable().optional(),
  isbn: z.string().max(20).nullable().optional(),
  status: z
    .enum(["PLAN_TO_WATCH", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "DROPPED"])
    .optional(),
  ownership: z.enum(["OWNED", "WISHLIST"]).optional(),
  platforms: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(MAX_PLATFORM_LENGTH, `Keep each platform or format under ${MAX_PLATFORM_LENGTH} characters`),
    )
    .max(MAX_PLATFORMS, `List at most ${MAX_PLATFORMS} platforms or formats`)
    .transform(normalizePlatforms)
    .optional(),
  // The copies owned (vault only). Requests from before copies existed
  // send platforms, ownedSeasons and completeSeries instead, which are
  // turned into copies the same way stored entries are.
  copies: copiesInputSchema.optional(),
  ownedSeasons: z.array(z.number().int().min(1).max(500)).max(500).optional(),
  completeSeries: z.boolean().optional(),
});

const VALID_OWNERSHIP = ["OWNED", "WISHLIST"];

/**
 * Lists one page of the current user's catalog, with optional status /
 * ownership / mediaType / q filters and a choice of sort, all applied in
 * the database (see lib/catalog-query.ts). Pass the previous response's
 * `nextCursor` back as `cursor` to fetch the next page; a null
 * `nextCursor` means there isn't one.
 */
export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ownershipParam = searchParams.get("ownership");
  const cursor = searchParams.get("cursor") ?? undefined;

  const params: CatalogQueryParams = {
    ownership: ownershipParam && VALID_OWNERSHIP.includes(ownershipParam) ? (ownershipParam as CatalogQueryParams["ownership"]) : "OWNED",
    status: readStatusParam(searchParams.get("status")),
    mediaType: readMediaTypeParam(searchParams.get("mediaType")),
    q: searchParams.get("q")?.trim() || undefined,
    sort: readSortParam(searchParams.get("sort")),
  };

  const page = await fetchCatalogPage(userId, params, cursor);
  return NextResponse.json(page);
}

/**
 * Saves a search result into the catalog: creates the shared MediaItem row
 * from the provider's data if it's new (refreshing it if it's stale), then
 * creates the user's personal progress row linking to it.
 */
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createCatalogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const where = {
    source_mediaType_externalId: {
      source: data.source,
      mediaType: data.mediaType,
      externalId: data.externalId,
    },
  };
  let mediaItem = await prisma.mediaItem.findUnique({ where });

  if (!mediaItem) {
    // MediaItem is shared by every user, so it's built from the provider's
    // own data, not the title, cover and so on the client sent.
    let metadata: UnifiedSearchResult = {
      source: data.source,
      externalId: data.externalId,
      mediaType: data.mediaType,
      title: data.title,
      releaseDate: data.releaseDate ?? null,
      coverUrl: data.coverUrl ?? null,
      overview: data.overview ?? null,
      genres: data.genres ?? [],
      creator: data.creator ?? null,
      isbn: data.isbn ?? null,
    };
    try {
      const fresh = await lookupMediaDetails(data);
      if (!fresh) {
        return NextResponse.json(
          { error: `${PROVIDER_NAMES[data.source]} doesn't have this title. Search for it again.` },
          { status: 400 },
        );
      }
      metadata = fresh;
    } catch (error) {
      // The provider is down or not configured. The submitted search result
      // is the best available, and it can only create a title here, never
      // change one; the title is refreshed from the provider later.
      console.warn(`Couldn't fetch ${data.source} ${data.externalId}; using the submitted details`, error);
    }
    // An upsert that never updates: if another request created the title
    // in the meantime, theirs is kept.
    mediaItem = await prisma.mediaItem.upsert({ where, update: {}, create: metadataCreateData(metadata) });
  } else if (isMetadataStale(mediaItem)) {
    // Best effort: an outdated title is still worth adding as-is.
    mediaItem = (await refreshMediaItem(mediaItem).catch(() => null)) ?? mediaItem;
  }

  // A wishlist item has no copies yet: whatever was sent is ignored.
  const ownership = data.ownership ?? "OWNED";
  const copies =
    ownership !== "OWNED"
      ? []
      : data.copies
        ? cleanCopies(data.copies, data.mediaType)
        : legacyCopies(
            {
              platforms: data.platforms ?? [],
              platform: null,
              ownedSeasons: data.ownedSeasons ?? [],
              completeSeries: data.completeSeries ?? false,
            },
            data.mediaType,
          ).copies;

  try {
    const progress = await prisma.userMediaProgress.create({
      data: {
        userId,
        mediaItemId: mediaItem.id,
        status: data.status ?? "PLAN_TO_WATCH",
        ownership,
        copies: { create: copies },
      },
      include: catalogEntryInclude,
    });
    return NextResponse.json({ entry: toCatalogEntry(progress) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.userMediaProgress.findUnique({
        where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
        include: catalogEntryInclude,
      });
      return NextResponse.json(
        {
          // Name the list the title is actually on, and say what opening it
          // is for there.
          error:
            existing?.ownership === "WISHLIST"
              ? "This title is already on your wishlist. Open it to move it to your vault."
              : "This title is already in your vault. Open it to add another platform or format.",
          entry: existing ? toCatalogEntry(existing) : null,
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
