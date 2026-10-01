import { describe, expect, it } from "vitest";
import { readMediaTypeParam, readSortParam, readStatusParam } from "@/lib/catalog-params";

describe("readMediaTypeParam", () => {
  it.each(["MOVIE", "TV", "GAME", "BOOK"])("accepts %s", (value) => {
    expect(readMediaTypeParam(value)).toBe(value);
  });

  it.each([null, undefined, "", "ALL", "movie", "PODCAST"])("rejects %s", (value) => {
    expect(readMediaTypeParam(value)).toBeUndefined();
  });
});

describe("readStatusParam", () => {
  it.each(["PLAN_TO_WATCH", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "DROPPED"])("accepts %s", (value) => {
    expect(readStatusParam(value)).toBe(value);
  });

  it.each([null, undefined, "", "ALL", "completed", "WATCHING"])("rejects %s", (value) => {
    expect(readStatusParam(value)).toBeUndefined();
  });
});

describe("readSortParam", () => {
  it.each(["recent", "title", "rating"])("accepts %s", (value) => {
    expect(readSortParam(value)).toBe(value);
  });

  it.each([null, undefined, "", "TITLE", "oldest"])("falls back to recent for %s", (value) => {
    expect(readSortParam(value)).toBe("recent");
  });
});
