import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/next-path";

describe("safeNextPath", () => {
  it("keeps paths on this site, with their query", () => {
    expect(safeNextPath("/wishlist")).toBe("/wishlist");
    expect(safeNextPath("/vault?type=game&sort=title")).toBe("/vault?type=game&sort=title");
  });

  it("falls back to the vault for anything that could leave the site", () => {
    for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "vault", "javascript:alert(1)"]) {
      expect(safeNextPath(value)).toBe("/vault");
    }
  });

  it("falls back to the vault when there's no next path", () => {
    expect(safeNextPath(undefined)).toBe("/vault");
    expect(safeNextPath(null)).toBe("/vault");
    expect(safeNextPath("")).toBe("/vault");
  });
});
