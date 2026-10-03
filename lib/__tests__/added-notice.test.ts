import { describe, expect, it } from "vitest";
import { addedNoticeMessage, entryMatchesFilters } from "@/lib/added-notice";
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
