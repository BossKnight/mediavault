import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, getCurrentUserId, consumeRateLimit, refreshMediaItem } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getCurrentUserId: vi.fn(),
  consumeRateLimit: vi.fn(),
  refreshMediaItem: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { userMediaProgress: { findUnique } } }));
vi.mock("@/lib/session", () => ({ getCurrentUserId }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  consumeRateLimit,
}));
vi.mock("@/lib/media-metadata", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/media-metadata")>()),
  refreshMediaItem,
}));

import { POST } from "@/app/api/catalog/[id]/refresh/route";

const mediaItem = {
  id: "media-1",
  source: "OPENLIBRARY",
  externalId: "OL893415W",
  mediaType: "BOOK",
  title: "Dune",
  releaseDate: null,
  coverUrl: null,
  overview: null,
  genres: [],
  creator: null,
  isbn: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const entry = {
  id: "entry-1",
  userId: "user-1",
  status: "PLAN_TO_WATCH",
  ownership: "OWNED",
  rating: null,
  reviewNotes: null,
  ownedSeasons: [],
  completeSeries: false,
  platforms: [],
  copies: [],
  platform: null,
  hoursPlayed: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  mediaItem,
};

const refresh = () =>
  POST(new Request("http://localhost/api/catalog/entry-1/refresh", { method: "POST" }), {
    params: Promise.resolve({ id: "entry-1" }),
  });

beforeEach(() => {
  getCurrentUserId.mockReset().mockResolvedValue("user-1");
  findUnique.mockReset().mockResolvedValue(entry);
  consumeRateLimit.mockReset().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  refreshMediaItem.mockReset().mockResolvedValue({ ...mediaItem, overview: "Arrakis." });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/catalog/[id]/refresh", () => {
  it("returns the entry with the refreshed details", async () => {
    const response = await refresh();

    expect(response.status).toBe(200);
    expect((await response.json()).entry.mediaItem.overview).toBe("Arrakis.");
    expect(consumeRateLimit.mock.calls[0]![0]).toBe("refresh:user-1");
  });

  it("only refreshes titles the user has", async () => {
    findUnique.mockResolvedValue({ ...entry, userId: "someone-else" });

    const response = await refresh();

    expect(response.status).toBe(404);
    expect(refreshMediaItem).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After once the user is over the limit", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 600 });

    const response = await refresh();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("600");
    expect(refreshMediaItem).not.toHaveBeenCalled();
  });

  it("returns 502 naming the provider when it can't be reached", async () => {
    refreshMediaItem.mockRejectedValue(new Error("down"));

    const response = await refresh();

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("Couldn't reach Open Library right now. Try again later.");
  });

  it("returns 404 and leaves the details alone when the provider no longer lists the title", async () => {
    refreshMediaItem.mockResolvedValue(null);

    const response = await refresh();

    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatch(/no longer lists this title/);
  });

  it("rejects requests without a session", async () => {
    getCurrentUserId.mockResolvedValue(null);

    expect((await refresh()).status).toBe(401);
  });
});
