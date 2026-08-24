import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { catalogEntryInclude, toCatalogEntry } from "@/lib/catalog";

const createCatalogSchema = z.object({
  source: z.enum(["TMDB", "RAWG"]),
  externalId: z.string().min(1),
  mediaType: z.enum(["MOVIE", "TV", "GAME"]),
  title: z.string().min(1),
  releaseDate: z.string().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  overview: z.string().nullable().optional(),
  genres: z.array(z.string()).optional(),
  creator: z.string().nullable().optional(),
  status: z
    .enum(["PLAN_TO_WATCH", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "DROPPED"])
    .optional(),
});

const VALID_STATUSES = [
  "PLAN_TO_WATCH",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
];
const VALID_MEDIA_TYPES = ["MOVIE", "TV", "GAME"];

/** Lists the current user's catalog, with optional status / mediaType / q filters. */
export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const mediaType = searchParams.get("mediaType");
  const q = searchParams.get("q")?.trim();

  const mediaItemWhere: Prisma.MediaItemWhereInput = {};
  if (mediaType && VALID_MEDIA_TYPES.includes(mediaType)) {
    mediaItemWhere.mediaType = mediaType as Prisma.EnumMediaTypeFilter["equals"];
  }
  if (q) {
    mediaItemWhere.title = { contains: q, mode: "insensitive" };
  }

  const where: Prisma.UserMediaProgressWhereInput = { userId };
  if (status && VALID_STATUSES.includes(status)) {
    where.status = status as Prisma.EnumWatchStatusFilter["equals"];
  }
  if (Object.keys(mediaItemWhere).length > 0) {
    where.mediaItem = mediaItemWhere;
  }

  const rows = await prisma.userMediaProgress.findMany({
    where,
    include: catalogEntryInclude,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ entries: rows.map(toCatalogEntry) });
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
    },
  });

  try {
    const progress = await prisma.userMediaProgress.create({
      data: {
        userId,
        mediaItemId: mediaItem.id,
        status: data.status ?? "PLAN_TO_WATCH",
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
          error: "This title is already in your catalog",
          entry: existing ? toCatalogEntry(existing) : null,
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
