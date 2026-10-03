import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { MAX_PLATFORMS, MAX_PLATFORM_LENGTH, normalizePlatforms } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { catalogEntryInclude, toCatalogEntry } from "@/lib/catalog";
import { fetchCatalogPage, type CatalogQueryParams } from "@/lib/catalog-query";
import { readMediaTypeParam, readSortParam, readStatusParam } from "@/lib/catalog-params";

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
 * Saves a search result into the catalog: upserts the shared MediaItem row,
 * then creates the user's personal progress row linking to it.
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

  const mediaItem = await prisma.mediaItem.upsert({
    where: { source_externalId: { source: data.source, externalId: data.externalId } },
    update: {
      title: data.title,
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
      coverUrl: data.coverUrl ?? null,
      overview: data.overview ?? null,
      genres: data.genres ?? [],
      creator: data.creator ?? null,
      isbn: data.isbn ?? null,
    },
    create: {
      source: data.source,
      externalId: data.externalId,
      mediaType: data.mediaType,
      title: data.title,
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
      coverUrl: data.coverUrl ?? null,
      overview: data.overview ?? null,
      genres: data.genres ?? [],
      creator: data.creator ?? null,
      isbn: data.isbn ?? null,
    },
  });

  try {
    const progress = await prisma.userMediaProgress.create({
      data: {
        userId,
        mediaItemId: mediaItem.id,
        status: data.status ?? "PLAN_TO_WATCH",
        ownership: data.ownership ?? "OWNED",
        platforms: data.platforms ?? [],
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
          error:
            "This title is already in your vault. Open it there to add another platform or format.",
          entry: existing ? toCatalogEntry(existing) : null,
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
