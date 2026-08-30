import { describe, expect, it } from "vitest";
import { hueFromString } from "@/lib/color-hash";

describe("hueFromString", () => {
  it("returns a value in the 0-359 range", () => {
    for (const value of ["a", "The Matrix", "", "Breaking Bad", "🎬"]) {
      const hue = hueFromString(value);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it("is deterministic for the same input", () => {
    expect(hueFromString("Breaking Bad")).toBe(hueFromString("Breaking Bad"));
  });

  it("differs across different inputs", () => {
    expect(hueFromString("Breaking Bad")).not.toBe(hueFromString("The Wire"));
  });
});
