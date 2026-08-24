import { describe, expect, it } from "vitest";
import { computeStats, sortCatalogEntries } from "@/lib/catalog";
import type { CatalogEntry } from "@/types/media";

function makeEntry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: "entry-1",
    status: "PLAN_TO_WATCH",
    rating: null,
    reviewNotes: null,
    ownedSeasons: [],
    completeSeries: false,
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
      makeEntry({ id: "1", rating: 4 }),
      makeEntry({ id: "2", rating: 3 }),
      makeEntry({ id: "3", rating: null }),
    ];

    const stats = computeStats(entries);

    expect(stats.averageRating).toBe(3.5);
  });
});

describe("sortCatalogEntries", () => {
  const entries = [
    makeEntry({
      id: "1",
      rating: 3,
      createdAt: "2024-01-01T00:00:00.000Z",
      mediaItem: { ...makeEntry().mediaItem, title: "Breaking Bad" },
    }),
    makeEntry({
      id: "2",
      rating: null,
      createdAt: "2024-03-01T00:00:00.000Z",
      mediaItem: { ...makeEntry().mediaItem, title: "Arrival" },
    }),
    makeEntry({
      id: "3",
      rating: 5,
      createdAt: "2024-02-01T00:00:00.000Z",
      mediaItem: { ...makeEntry().mediaItem, title: "The Matrix" },
    }),
  ];

  it("does not mutate the input array", () => {
    const original = [...entries];
    sortCatalogEntries(entries, "title");
    expect(entries).toEqual(original);
  });

  it("sorts by title alphabetically", () => {
    expect(sortCatalogEntries(entries, "title").map((entry) => entry.id)).toEqual(["2", "1", "3"]);
  });

  it("sorts by rating, highest first, with unrated entries last", () => {
    expect(sortCatalogEntries(entries, "rating").map((entry) => entry.id)).toEqual(["3", "1", "2"]);
  });

  it("sorts by recently added, newest first", () => {
    expect(sortCatalogEntries(entries, "recent").map((entry) => entry.id)).toEqual(["2", "3", "1"]);
  });
});
