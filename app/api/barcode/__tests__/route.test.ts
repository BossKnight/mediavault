import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserId, consumeRateLimit, lookupIsbn } = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  consumeRateLimit: vi.fn(),
  lookupIsbn: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentUserId }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  consumeRateLimit,
}));
vi.mock("@/lib/external-apis/openlibrary", () => ({ lookupIsbn }));
vi.mock("@/lib/external-apis/upcitemdb", () => ({ lookupUpc: vi.fn() }));
vi.mock("@/lib/external-apis", () => ({ searchMedia: vi.fn() }));

import { GET } from "@/app/api/barcode/route";

const isbnRequest = () => new Request("http://localhost/api/barcode?code=9780261103573&type=book");

beforeEach(() => {
  getCurrentUserId.mockReset().mockResolvedValue("user-1");
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  lookupIsbn.mockReset().mockResolvedValue(null);
});

describe("GET /api/barcode rate limiting", () => {
  it("counts lookups per signed-in user", async () => {
    const response = await GET(isbnRequest());

    expect(response.status).toBe(200);
    expect(consumeRateLimit.mock.calls[0]![0]).toBe("barcode:user-1");
  });

  it("returns 429 with Retry-After once the user is over the limit, before any lookup", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 900 });

    const response = await GET(isbnRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(lookupIsbn).not.toHaveBeenCalled();
  });

  it("checks auth before spending any rate limit", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await GET(isbnRequest());

    expect(response.status).toBe(401);
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });
});
