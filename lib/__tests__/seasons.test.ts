import { describe, expect, it } from "vitest";
import { describeSeasons, formatSeasonList, parseSeasonInput, parseSeasonList } from "@/lib/seasons";

describe("parseSeasonList", () => {
  it("parses comma-separated season numbers", () => {
    expect(parseSeasonList("1, 2, 6")).toEqual([1, 2, 6]);
  });

  it("parses space-separated season numbers", () => {
    expect(parseSeasonList("1 2 6")).toEqual([1, 2, 6]);
  });

  it("sorts and deduplicates out-of-order input", () => {
    expect(parseSeasonList("6, 1, 2, 1, 6")).toEqual([1, 2, 6]);
  });

  it("ignores non-numeric and non-positive garbage", () => {
    expect(parseSeasonList("1, season two, -3, 0, 4")).toEqual([1, 4]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseSeasonList("")).toEqual([]);
    expect(parseSeasonList("   ")).toEqual([]);
  });
});

describe("parseSeasonInput", () => {
  it("reports parsed seasons and invalid tokens separately", () => {
    expect(parseSeasonInput("1, season two, -3, 0, 4")).toEqual({
      seasons: [1, 4],
      invalidTokens: ["season", "two", "-3", "0"],
    });
  });

  it("returns no invalid tokens for clean input", () => {
    expect(parseSeasonInput("1, 2, 6")).toEqual({ seasons: [1, 2, 6], invalidTokens: [] });
  });

  it("returns empty results for blank input", () => {
    expect(parseSeasonInput("")).toEqual({ seasons: [], invalidTokens: [] });
  });
});

describe("formatSeasonList", () => {
  it("joins season numbers with a comma and space", () => {
    expect(formatSeasonList([1, 2, 6])).toBe("1, 2, 6");
  });

  it("returns an empty string for an empty list", () => {
    expect(formatSeasonList([])).toBe("");
  });
});

describe("describeSeasons", () => {
  it("collapses runs of seasons", () => {
    expect(describeSeasons([4])).toBe("Season 4");
    expect(describeSeasons([5, 4])).toBe("Seasons 4–5");
    expect(describeSeasons([1, 2, 3, 6])).toBe("Seasons 1–3, 6");
    expect(describeSeasons([1, 3, 5])).toBe("Seasons 1, 3, 5");
  });

  it("says complete series, or nothing", () => {
    expect(describeSeasons([], true)).toBe("Complete series");
    expect(describeSeasons([])).toBe("");
  });
});
