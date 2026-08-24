import { describe, expect, it } from "vitest";
import { computeStats } from "@/lib/catalog";
import type { CatalogEntry } from "@/types/media";

function makeEntry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: "entry-1",
    status: "PLAN_TO_WATCH",
    rating: null,
    reviewNotes: null,
    currentSeason: null,
    currentEpisode: null,
    platform: null,
    hoursPlayed: null,
    startedAt: null,
    completedAt: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    mediaItem: {
      id: "media-1",
      source: "TMDB",
      externalId: "1",
      mediaType: "MOVIE",
      title: "Example",
      releaseDate: null,
      coverUrl: null,
      overview: null,
      genres: [],
      creator: null,
    },
    ...overrides,
  };
}

describe("computeStats", () => {
  it("returns zeroed stats for an empty catalog", () => {
    const stats = computeStats([]);

    expect(stats.total).toBe(0);
    expect(stats.averageRating).toBeNull();
    expect(stats.byStatus.COMPLETED).toBe(0);
    expect(stats.byMediaType.GAME).toBe(0);
  });

  it("tallies status and media type counts", () => {
    const entries = [
      makeEntry({ id: "1", status: "COMPLETED", mediaItem: { ...makeEntry().mediaItem, mediaType: "MOVIE" } }),
      makeEntry({ id: "2", status: "COMPLETED", mediaItem: { ...makeEntry().mediaItem, mediaType: "TV" } }),
      makeEntry({ id: "3", status: "IN_PROGRESS", mediaItem: { ...makeEntry().mediaItem, mediaType: "GAME" } }),
    ];

    const stats = computeStats(entries);

    expect(stats.total).toBe(3);
    expect(stats.byStatus.COMPLETED).toBe(2);
    expect(stats.byStatus.IN_PROGRESS).toBe(1);
    expect(stats.byMediaType.MOVIE).toBe(1);
    expect(stats.byMediaType.TV).toBe(1);
    expect(stats.byMediaType.GAME).toBe(1);
  });

  it("averages only the entries that have a rating", () => {
    const entries = [
      makeEntry({ id: "1", rating: 8 }),
      makeEntry({ id: "2", rating: 6 }),
      makeEntry({ id: "3", rating: null }),
    ];

    const stats = computeStats(entries);

    expect(stats.averageRating).toBe(7);
  });
});
