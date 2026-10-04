import { describe, expect, it } from "vitest";
import { addedNoticeMessage, distinctTitles, entryMatchesFilters } from "@/lib/added-notice";
import type { CatalogEntry } from "@/types/media";

function entry(title: string, mediaType: CatalogEntry["mediaItem"]["mediaType"] = "MOVIE"): CatalogEntry {
  return {
    id: title,
    status: "PLAN_TO_WATCH",
    ownership: "OWNED",
    platforms: [],
    mediaItem: { title, mediaType },
  } as unknown as CatalogEntry;
}

describe("addedNoticeMessage", () => {
  it("names one or two titles", () => {
    expect(addedNoticeMessage(["Alien"], "OWNED")).toBe("Added “Alien” to your vault.");
    expect(addedNoticeMessage(["Alien", "Halo"], "WISHLIST")).toBe(
      "Added “Alien” and “Halo” to your wishlist.",
    );
  });

  it("counts three or more", () => {
    expect(addedNoticeMessage(["A", "B", "C"], "OWNED")).toBe("Added 3 items to your vault.");
  });
});

describe("entryMatchesFilters", () => {
  it("matches with no filters", () => {
    expect(entryMatchesFilters(entry("Alien"), {})).toBe(true);
  });

  it("matches the search against the title, ignoring case and padding", () => {
    expect(entryMatchesFilters(entry("Alien"), { q: "  ALI " })).toBe(true);
    expect(entryMatchesFilters(entry("Alien"), { q: "halo" })).toBe(false);
  });

  it("applies the type and status filters", () => {
    expect(entryMatchesFilters(entry("Halo", "GAME"), { mediaType: "GAME" })).toBe(true);
    expect(entryMatchesFilters(entry("Halo", "GAME"), { mediaType: "BOOK" })).toBe(false);
    expect(entryMatchesFilters(entry("Halo"), { status: "PLAN_TO_WATCH" })).toBe(true);
    expect(entryMatchesFilters(entry("Halo"), { status: "COMPLETED" })).toBe(false);
  });
});

describe("distinctTitles", () => {
  const entry = (title: string, releaseDate: string | null) =>
    ({ mediaItem: { title, releaseDate } }) as unknown as CatalogEntry;

  it("adds the year only where titles repeat", () => {
    const titles = distinctTitles([
      entry("Paper Mario: The Thousand-Year Door", "2004-07-22"),
      entry("Paper Mario: The Thousand-Year Door", "2024-05-23"),
    ]);
    expect(addedNoticeMessage(titles, "OWNED")).toBe(
      "Added “Paper Mario: The Thousand-Year Door” (2004) and “Paper Mario: The Thousand-Year Door” (2024) to your vault.",
    );
    expect(distinctTitles([entry("Dogma", "1999-11-12"), entry("Alien", "1979-05-25")])).toEqual(["Dogma", "Alien"]);
  });
});
