import { describe, expect, it } from "vitest";
import {
  canonicalPlatform,
  normalizePlatforms,
  parsePlatformList,
  storedPlatforms,
} from "@/lib/platforms";
import { BOOK_FORMATS, PHYSICAL_FORMATS } from "@/types/media";

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

describe("canonicalPlatform", () => {
  it("maps RAWG's and common spellings of game platforms to short names", () => {
    expect(canonicalPlatform("PlayStation 2")).toBe("PS2");
    expect(canonicalPlatform(" nintendo switch ")).toBe("Switch");
    expect(canonicalPlatform("Xbox Series S/X")).toBe("Xbox Series X|S");
    expect(canonicalPlatform("macOS")).toBe("Mac");
  });

  it("passes other names and formats through, trimmed", () => {
    expect(canonicalPlatform(" Atari 2600 ")).toBe("Atari 2600");
    for (const format of [...PHYSICAL_FORMATS, ...BOOK_FORMATS]) {
      expect(canonicalPlatform(format)).toBe(format);
    }
  });
});

describe("normalizePlatforms with game platform names", () => {
  it("merges spellings of one platform, keeping the first position", () => {
    expect(normalizePlatforms(["PlayStation 2", "PC", "ps2", "Nintendo Switch"])).toEqual([
      "PS2",
      "PC",
      "Switch",
    ]);
  });
});
