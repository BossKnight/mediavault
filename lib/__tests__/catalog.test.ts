import { describe, expect, it } from "vitest";
import { computeStats, recommendNext, sortCatalogEntries } from "@/lib/catalog";
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

describe("recommendNext", () => {
  function genreEntry(id: string, overrides: Partial<CatalogEntry> = {}): CatalogEntry {
    return makeEntry({ id, mediaItem: { ...makeEntry().mediaItem, id: `media-${id}` }, ...overrides });
  }

  it("returns nothing for an empty catalog", () => {
    expect(recommendNext([])).toEqual([]);
  });

  it("returns nothing when no entries have a rating yet", () => {
    const entries = [
      genreEntry("1", { status: "PLAN_TO_WATCH", rating: null, mediaItem: { ...makeEntry().mediaItem, genres: ["Mystery"] } }),
    ];
    expect(recommendNext(entries)).toEqual([]);
  });

  it("favors genres by average rating, not by how many rated entries have them", () => {
    const entries = [
      genreEntry("sci-fi-rated", { status: "COMPLETED", rating: 5, mediaItem: { ...makeEntry().mediaItem, genres: ["Sci-Fi"] } }),
      genreEntry("drama-rated", { status: "COMPLETED", rating: 4, mediaItem: { ...makeEntry().mediaItem, genres: ["Drama"] } }),
      genreEntry("comedy-rated", { status: "COMPLETED", rating: 3, mediaItem: { ...makeEntry().mediaItem, genres: ["Comedy"] } }),
      // Horror has three rated entries (highest count) but the lowest average
      // rating, so it should lose out to the three higher-average genres
      // above despite the count advantage.
      genreEntry("horror-rated-1", { status: "COMPLETED", rating: 1, mediaItem: { ...makeEntry().mediaItem, genres: ["Horror"] } }),
      genreEntry("horror-rated-2", { status: "COMPLETED", rating: 1, mediaItem: { ...makeEntry().mediaItem, genres: ["Horror"] } }),
      genreEntry("horror-rated-3", { status: "COMPLETED", rating: 1, mediaItem: { ...makeEntry().mediaItem, genres: ["Horror"] } }),
      genreEntry("sci-fi-candidate", { status: "PLAN_TO_WATCH", rating: null, mediaItem: { ...makeEntry().mediaItem, genres: ["Sci-Fi"] } }),
      genreEntry("horror-candidate", { status: "PLAN_TO_WATCH", rating: null, mediaItem: { ...makeEntry().mediaItem, genres: ["Horror"] } }),
    ];

    const result = recommendNext(entries);

    expect(result.map((entry) => entry.id)).toContain("sci-fi-candidate");
    expect(result.map((entry) => entry.id)).not.toContain("horror-candidate");
  });

  it("only recommends plan-to-watch entries", () => {
    const entries = [
      genreEntry("rated", { status: "COMPLETED", rating: 5, mediaItem: { ...makeEntry().mediaItem, genres: ["Drama"] } }),
      genreEntry("already-watching", { status: "IN_PROGRESS", rating: null, mediaItem: { ...makeEntry().mediaItem, genres: ["Drama"] } }),
      genreEntry("candidate", { status: "PLAN_TO_WATCH", rating: null, mediaItem: { ...makeEntry().mediaItem, genres: ["Drama"] } }),
    ];

    const result = recommendNext(entries);

    expect(result.map((entry) => entry.id)).toEqual(["candidate"]);
  });

  it("caps recommendations at 4", () => {
    const entries = [
      genreEntry("rated", { status: "COMPLETED", rating: 5, mediaItem: { ...makeEntry().mediaItem, genres: ["Drama"] } }),
      ...["a", "b", "c", "d", "e"].map((suffix) =>
        genreEntry(`candidate-${suffix}`, {
          status: "PLAN_TO_WATCH",
          rating: null,
          mediaItem: { ...makeEntry().mediaItem, genres: ["Drama"] },
        }),
      ),
    ];

    expect(recommendNext(entries)).toHaveLength(4);
  });

  it("excludes unrated entries from genre scoring, but they can still surface via another rated entry's genre", () => {
    const entries = [
      genreEntry("rated-drama", { status: "COMPLETED", rating: 5, mediaItem: { ...makeEntry().mediaItem, genres: ["Drama"] } }),
      // Unrated, so it contributes nothing to genre scoring on its own...
      genreEntry("unrated-drama", { status: "COMPLETED", rating: null, mediaItem: { ...makeEntry().mediaItem, genres: ["Drama"] } }),
      // ...but Drama is still favored because of the rated entry above, so
      // this unrated plan-to-watch candidate is still recommended.
      genreEntry("candidate", { status: "PLAN_TO_WATCH", rating: null, mediaItem: { ...makeEntry().mediaItem, genres: ["Drama"] } }),
    ];

    expect(recommendNext(entries).map((entry) => entry.id)).toEqual(["candidate"]);
  });
});
