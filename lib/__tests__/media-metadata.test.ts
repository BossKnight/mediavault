import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import type { MediaItem } from "@prisma/client";
import { isMetadataStale, metadataCreateData, metadataUpdateData } from "@/lib/media-metadata";
import type { UnifiedSearchResult } from "@/types/media";

const existing: MediaItem = {
  id: "media-1",
  source: "RAWG",
  externalId: "5286",
  mediaType: "GAME",
  title: "Destroy All Humans!",
  releaseDate: new Date("2005-06-21"),
  coverUrl: "https://old.example/cover.jpg",
  overview: "Old overview",
  genres: ["Action"],
  creator: null,
  isbn: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const fresh: UnifiedSearchResult = {
  source: "RAWG",
  externalId: "5286",
  mediaType: "GAME",
  title: "Destroy All Humans! (2005)",
  releaseDate: null,
  coverUrl: null,
  overview: "New overview",
  genres: [],
  creator: "Pandemic Studios",
};

describe("isMetadataStale", () => {
  it("is stale only after 30 days", () => {
    const now = new Date("2026-01-31T00:00:01Z");
    expect(isMetadataStale({ updatedAt: new Date("2026-01-01T00:00:00Z") }, now)).toBe(true);
    expect(isMetadataStale({ updatedAt: new Date("2026-01-02T00:00:00Z") }, now)).toBe(false);
  });
});

describe("metadataUpdateData", () => {
  it("takes the provider's values but keeps stored ones it leaves empty", () => {
    expect(metadataUpdateData(existing, fresh)).toEqual({
      title: "Destroy All Humans! (2005)",
      releaseDate: existing.releaseDate,
      coverUrl: "https://old.example/cover.jpg",
      overview: "New overview",
      genres: ["Action"],
      creator: "Pandemic Studios",
      isbn: null,
    });
  });

  it("keeps the stored title when the provider has none", () => {
    expect(metadataUpdateData(existing, { ...fresh, title: "Untitled" }).title).toBe("Destroy All Humans!");
  });
});

describe("metadataCreateData", () => {
  it("maps a result to MediaItem columns", () => {
    expect(metadataCreateData({ ...fresh, releaseDate: "2005-06-21" })).toMatchObject({
      source: "RAWG",
      externalId: "5286",
      releaseDate: new Date("2005-06-21"),
      isbn: null,
    });
  });
});
