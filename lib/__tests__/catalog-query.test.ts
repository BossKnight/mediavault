import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { userMediaProgress: { findMany } } }));

import { CATALOG_PAGE_SIZE, fetchCatalogPage, fetchCatalogStats } from "@/lib/catalog-query";

function makeRow(id: string) {
  const date = new Date("2024-01-01T00:00:00.000Z");
  return {
    id,
    userId: "user-1",
    mediaItemId: `media-${id}`,
    status: "PLAN_TO_WATCH",
    ownership: "OWNED",
    rating: null,
    reviewNotes: null,
    ownedSeasons: [],
    completeSeries: false,
    platforms: [],
    hoursPlayed: null,
    startedAt: null,
    completedAt: null,
    createdAt: date,
    updatedAt: date,
    mediaItem: {
      id: `media-${id}`,
      source: "TMDB",
      externalId: id,
      mediaType: "MOVIE",
      title: `Title ${id}`,
      releaseDate: null,
      coverUrl: null,
      overview: null,
      genres: [],
      creator: null,
      isbn: null,
    },
  };
}

function makeRows(count: number) {
  return Array.from({ length: count }, (_, index) => makeRow(`row-${index + 1}`));
}

function lastQuery() {
  return findMany.mock.calls.at(-1)![0];
}

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue([]);
});

describe("fetchCatalogPage filtering", () => {
  it("scopes to the user and ownership, with no media item filter when none is given", async () => {
    await fetchCatalogPage("user-1", { ownership: "WISHLIST" });

    expect(lastQuery().where).toEqual({ userId: "user-1", ownership: "WISHLIST" });
  });

  it("combines status, media type, and a case-insensitive title search", async () => {
    await fetchCatalogPage("user-1", {
      ownership: "OWNED",
      status: "COMPLETED",
      mediaType: "BOOK",
      q: "dune",
    });

    expect(lastQuery().where).toEqual({
      userId: "user-1",
      ownership: "OWNED",
      status: "COMPLETED",
      mediaItem: { mediaType: "BOOK", title: { contains: "dune", mode: "insensitive" } },
    });
  });
});

describe("fetchCatalogPage sorting", () => {
  it.each([
    [undefined, [{ createdAt: "desc" }, { id: "desc" }]],
    ["recent", [{ createdAt: "desc" }, { id: "desc" }]],
    ["title", [{ mediaItem: { title: "asc" } }, { id: "asc" }]],
    ["rating", [{ rating: { sort: "desc", nulls: "last" } }, { id: "desc" }]],
  ] as const)("orders %s with an id tiebreaker", async (sort, expected) => {
    await fetchCatalogPage("user-1", { ownership: "OWNED", sort });

    expect(lastQuery().orderBy).toEqual(expected);
  });
});

describe("fetchCatalogPage pagination", () => {
  it("fetches one extra row to detect another page", async () => {
    await fetchCatalogPage("user-1", { ownership: "OWNED" });

    expect(lastQuery().take).toBe(CATALOG_PAGE_SIZE + 1);
    expect(lastQuery()).not.toHaveProperty("cursor");
  });

  it("resumes after the cursor row", async () => {
    await fetchCatalogPage("user-1", { ownership: "OWNED" }, "row-60");

    expect(lastQuery()).toMatchObject({ cursor: { id: "row-60" }, skip: 1 });
  });

  it("returns a full page and the last returned id as the cursor when more rows exist", async () => {
    findMany.mockResolvedValue(makeRows(CATALOG_PAGE_SIZE + 1));

    const page = await fetchCatalogPage("user-1", { ownership: "OWNED" });

    expect(page.entries).toHaveLength(CATALOG_PAGE_SIZE);
    expect(page.nextCursor).toBe(`row-${CATALOG_PAGE_SIZE}`);
  });

  it("returns no cursor when the page is exactly full", async () => {
    findMany.mockResolvedValue(makeRows(CATALOG_PAGE_SIZE));

    const page = await fetchCatalogPage("user-1", { ownership: "OWNED" });

    expect(page.entries).toHaveLength(CATALOG_PAGE_SIZE);
    expect(page.nextCursor).toBeNull();
  });

  it("maps rows to catalog entries with ISO date strings", async () => {
    findMany.mockResolvedValue([makeRow("row-1")]);

    const { entries } = await fetchCatalogPage("user-1", { ownership: "OWNED" });

    expect(entries[0]).toMatchObject({
      id: "row-1",
      createdAt: "2024-01-01T00:00:00.000Z",
      mediaItem: { title: "Title row-1" },
    });
  });
});

describe("fetchCatalogStats", () => {
  it("ignores filters and computes totals across the whole collection", async () => {
    findMany.mockResolvedValue([
      { status: "COMPLETED", rating: 4, mediaItem: { mediaType: "MOVIE" } },
      { status: "COMPLETED", rating: 2, mediaItem: { mediaType: "BOOK" } },
      { status: "PLAN_TO_WATCH", rating: null, mediaItem: { mediaType: "BOOK" } },
    ]);

    const stats = await fetchCatalogStats("user-1", "OWNED");

    expect(lastQuery().where).toEqual({ userId: "user-1", ownership: "OWNED" });
    expect(stats.total).toBe(3);
    expect(stats.byStatus.COMPLETED).toBe(2);
    expect(stats.byMediaType.BOOK).toBe(2);
    expect(stats.averageRating).toBe(3);
  });
});
