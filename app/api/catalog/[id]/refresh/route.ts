import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { catalogEntryInclude, toCatalogEntry } from "@/lib/catalog";
import { PROVIDER_NAMES, refreshMediaItem } from "@/lib/media-metadata";

/**
 * Re-fetches the title behind one of the user's vault or wishlist entries
 * from its provider (TMDB, RAWG or Open Library) and returns the entry with
 * the updated details. Only users who have the title can refresh it.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.userMediaProgress.findUnique({ where: { id }, include: catalogEntryInclude });
  if (!entry || entry.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rateLimit = await consumeRateLimit(`refresh:${userId}`, RATE_LIMITS.refresh);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "You've refreshed a lot of titles recently. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const providerName = PROVIDER_NAMES[entry.mediaItem.source];
  let mediaItem;
  try {
    mediaItem = await refreshMediaItem(entry.mediaItem);
  } catch (error) {
    console.warn(`Couldn't refresh ${entry.mediaItem.source} ${entry.mediaItem.externalId}`, error);
    return NextResponse.json(
      { error: `Couldn't reach ${providerName} right now. Try again later.` },
      { status: 502 },
    );
  }
  if (!mediaItem) {
    return NextResponse.json(
      { error: `${providerName} no longer lists this title, so its details were left as they are.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ entry: toCatalogEntry({ ...entry, mediaItem }) });
}
