import { describe, expect, it } from "vitest";
import { normalizePlatforms, parsePlatformList, storedPlatforms } from "@/lib/platforms";

describe("normalizePlatforms", () => {
  it("trims, drops blanks and drops repeats regardless of case", () => {
    expect(normalizePlatforms([" PS2 ", "", "Xbox", "ps2", "  "])).toEqual(["PS2", "Xbox"]);
  });

  it("keeps the order things were added in", () => {
    expect(normalizePlatforms(["Blu-Ray", "DVD"])).toEqual(["Blu-Ray", "DVD"]);
  });
});

describe("parsePlatformList", () => {
  it("splits comma-separated text", () => {
    expect(parsePlatformList("PS2, Xbox")).toEqual(["PS2", "Xbox"]);
  });

  it("ignores stray and trailing commas", () => {
    expect(parsePlatformList(",PS2,, Xbox,")).toEqual(["PS2", "Xbox"]);
    expect(parsePlatformList("")).toEqual([]);
  });
});

describe("storedPlatforms", () => {
  it("prefers the list", () => {
    expect(storedPlatforms({ platforms: ["PS2", "Xbox"], platform: "PS2" })).toEqual(["PS2", "Xbox"]);
  });

  it("reads a legacy single value as a one-item list", () => {
    expect(storedPlatforms({ platforms: [], platform: "DVD" })).toEqual(["DVD"]);
  });

  it("is empty when nothing is set", () => {
    expect(storedPlatforms({ platforms: [], platform: null })).toEqual([]);
  });
});
