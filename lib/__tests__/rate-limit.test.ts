import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, executeRaw } = vi.hoisted(() => ({ queryRaw: vi.fn(), executeRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw, $executeRaw: executeRaw } }));

import { clientIpFromHeaders, consumeRateLimit } from "@/lib/rate-limit";

// The SQL itself (atomic upsert, window reset, concurrency) was verified
// against a real Postgres; these cover the decisions made around it.
const rule = { limit: 3, windowSeconds: 60 };

beforeEach(() => {
  queryRaw.mockReset();
  executeRaw.mockReset().mockResolvedValue(0);
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("consumeRateLimit", () => {
  it("allows requests up to and including the limit", async () => {
    queryRaw.mockResolvedValue([{ count: 3, retryAfterSeconds: 42 }]);

    expect(await consumeRateLimit("k", rule)).toEqual({ allowed: true, retryAfterSeconds: 42 });
  });

  it("blocks requests past the limit and reports when the window resets", async () => {
    queryRaw.mockResolvedValue([{ count: 4, retryAfterSeconds: 42 }]);

    expect(await consumeRateLimit("k", rule)).toEqual({ allowed: false, retryAfterSeconds: 42 });
  });

  it("fails open when the database is unavailable", async () => {
    queryRaw.mockRejectedValue(new Error("connection refused"));

    expect(await consumeRateLimit("k", rule)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(console.error).toHaveBeenCalled();
  });

  it("only occasionally sweeps stale rows", async () => {
    queryRaw.mockResolvedValue([{ count: 1, retryAfterSeconds: 60 }]);

    await consumeRateLimit("k", rule);
    expect(executeRaw).not.toHaveBeenCalled();

    vi.mocked(Math.random).mockReturnValue(0);
    await consumeRateLimit("k", rule);
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it("does not fail the request when the sweep fails", async () => {
    queryRaw.mockResolvedValue([{ count: 1, retryAfterSeconds: 60 }]);
    executeRaw.mockRejectedValue(new Error("lock timeout"));
    vi.mocked(Math.random).mockReturnValue(0);

    expect(await consumeRateLimit("k", rule)).toEqual({ allowed: true, retryAfterSeconds: 60 });
  });
});

describe("clientIpFromHeaders", () => {
  it("uses the last X-Forwarded-For entry, the one the proxy appended", () => {
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" });

    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("reads a plain header record, including array values", () => {
    expect(clientIpFromHeaders({ "x-forwarded-for": "198.51.100.2" })).toBe("198.51.100.2");
    expect(clientIpFromHeaders({ "x-forwarded-for": ["1.1.1.1", "198.51.100.2"] })).toBe("198.51.100.2");
  });

  it.each([
    ["missing", {}],
    ["empty", { "x-forwarded-for": "" }],
    ["only separators", { "x-forwarded-for": " , " }],
  ])("falls back to a shared bucket when the header is %s", (_, headers) => {
    expect(clientIpFromHeaders(headers)).toBe("unknown");
  });
});
