import { describe, expect, it } from "vitest";
import { formatSeasonList, parseSeasonList } from "@/lib/seasons";

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

describe("formatSeasonList", () => {
  it("joins season numbers with a comma and space", () => {
    expect(formatSeasonList([1, 2, 6])).toBe("1, 2, 6");
  });

  it("returns an empty string for an empty list", () => {
    expect(formatSeasonList([])).toBe("");
  });
});
