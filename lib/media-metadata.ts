import type { MediaItem, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lookupMediaDetails } from "@/lib/external-apis";
import type { MetadataSource, UnifiedSearchResult } from "@/types/media";

/** A title's details are refreshed from its provider when added after this long. */
export const METADATA_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const PROVIDER_NAMES: Record<MetadataSource, string> = {
  TMDB: "TMDB",
  RAWG: "RAWG",
  OPENLIBRARY: "Open Library",
};

export function isMetadataStale(item: Pick<MediaItem, "updatedAt">, now = new Date()): boolean {
  return now.getTime() - item.updatedAt.getTime() > METADATA_MAX_AGE_MS;
}

/** The columns for a new MediaItem built from a provider (or search) result. */
export function metadataCreateData(result: UnifiedSearchResult): Prisma.MediaItemCreateInput {
  return {
    source: result.source,
    externalId: result.externalId,
    mediaType: result.mediaType,
    title: result.title,
    releaseDate: result.releaseDate ? new Date(result.releaseDate) : null,
    coverUrl: result.coverUrl,
    overview: result.overview,
    genres: result.genres,
    creator: result.creator,
    isbn: result.isbn ?? null,
  };
}

/**
 * The columns to write when refreshing a stored title. The provider's data
 * wins, but a field it leaves empty keeps what's stored: a details endpoint
 * can lack something the original search result had (a year, a cover), and
 * a refresh shouldn't blank it.
 */
export function metadataUpdateData(existing: MediaItem, fresh: UnifiedSearchResult): Prisma.MediaItemUpdateInput {
  return {
    // Normalizers fall back to "Untitled" when a payload has no title.
    title: fresh.title !== "Untitled" ? fresh.title : existing.title,
    releaseDate: fresh.releaseDate ? new Date(fresh.releaseDate) : existing.releaseDate,
    coverUrl: fresh.coverUrl ?? existing.coverUrl,
    overview: fresh.overview ?? existing.overview,
    genres: fresh.genres.length > 0 ? fresh.genres : existing.genres,
    creator: fresh.creator ?? existing.creator,
    isbn: fresh.isbn ?? existing.isbn,
  };
}

/**
 * Re-fetches a stored title from its provider and saves the result (which
 * also restarts its staleness clock). Returns null when the provider no
 * longer has the title; throws when the provider can't be reached.
 */
export async function refreshMediaItem(item: MediaItem): Promise<MediaItem | null> {
  const fresh = await lookupMediaDetails(item);
  if (!fresh) return null;
  return prisma.mediaItem.update({ where: { id: item.id }, data: metadataUpdateData(item, fresh) });
}
