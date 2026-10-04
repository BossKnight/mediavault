import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mediaFindUnique, upsert, create, findUnique, getCurrentUserId, lookupMediaDetails, refreshMediaItem } =
  vi.hoisted(() => ({
    mediaFindUnique: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    getCurrentUserId: vi.fn(),
    lookupMediaDetails: vi.fn(),
    refreshMediaItem: vi.fn(),
  }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    mediaItem: { findUnique: mediaFindUnique, upsert },
    userMediaProgress: { create, findUnique },
  },
}));
vi.mock("@/lib/session", () => ({ getCurrentUserId }));
vi.mock("@/lib/external-apis", () => ({ lookupMediaDetails }));
vi.mock("@/lib/media-metadata", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/media-metadata")>()),
  refreshMediaItem,
}));

import { POST } from "@/app/api/catalog/route";

const providerResult = {
  source: "RAWG",
  externalId: "5286",
  mediaType: "GAME",
  title: "Destroy All Humans!",
  releaseDate: "2005-06-21",
  coverUrl: "https://media.rawg.io/dah.jpg",
  overview: "Play as Crypto.",
  genres: ["Action"],
  creator: "Pandemic Studios",
};

const storedItem = {
  id: "media-1",
  source: "RAWG",
  externalId: "5286",
  mediaType: "GAME",
  title: "Destroy All Humans!",
  releaseDate: null,
  coverUrl: null,
  overview: null,
  genres: [],
  creator: null,
  isbn: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function progressRow(data: Record<string, unknown>) {
  // A create's nested `copies: { create: [...] }` comes back as stored rows.
  const { copies, ...fields } = data as { copies?: { create: Record<string, unknown>[] } };
  return {
    id: "entry-1",
    rating: null,
    reviewNotes: null,
    ownedSeasons: [],
    completeSeries: false,
    platform: null,
    hoursPlayed: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    platforms: [],
    ...fields,
    copies: (copies?.create ?? []).map((copy, index) => ({
      id: `copy-${index + 1}`,
      progressId: "entry-1",
      createdAt: new Date("2026-01-01"),
      ...copy,
    })),
    mediaItem: storedItem,
  };
}

function addRequest(body: unknown) {
  return new Request("http://localhost/api/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// What the client sends: a search result, which the server shouldn't trust.
const validBody = {
  source: "RAWG",
  externalId: "5286",
  mediaType: "GAME",
  title: "Renamed by the client",
  coverUrl: "https://evil.example/x.png",
  platforms: ["PS2", " ps2 ", "Xbox"],
};

beforeEach(() => {
  getCurrentUserId.mockReset().mockResolvedValue("user-1");
  mediaFindUnique.mockReset().mockResolvedValue(null);
  upsert.mockReset().mockResolvedValue(storedItem);
  lookupMediaDetails.mockReset().mockResolvedValue(providerResult);
  refreshMediaItem.mockReset().mockResolvedValue(storedItem);
  create.mockReset().mockImplementation(async ({ data }) => progressRow(data));
  findUnique
    .mockReset()
    .mockResolvedValue(progressRow({ status: "PLAN_TO_WATCH", ownership: "OWNED", platforms: ["PS2"] }));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/catalog", () => {
  it("creates a new title from the provider's data, not the client's", async () => {
    const response = await POST(addRequest(validBody));

    expect(response.status).toBe(201);
    expect(lookupMediaDetails).toHaveBeenCalledWith(expect.objectContaining({ source: "RAWG", externalId: "5286" }));
    const { create: created, update } = upsert.mock.calls[0]![0];
    expect(created).toMatchObject({ title: "Destroy All Humans!", coverUrl: "https://media.rawg.io/dah.jpg" });
    expect(update).toEqual({});
  });

  it("looks titles up by media type too, so a TMDB movie and show with the same id stay apart", async () => {
    await POST(addRequest(validBody));

    expect(mediaFindUnique.mock.calls[0]![0].where).toEqual({
      source_mediaType_externalId: { source: "RAWG", mediaType: "GAME", externalId: "5286" },
    });
    expect(upsert.mock.calls[0]![0].where).toEqual(mediaFindUnique.mock.calls[0]![0].where);
  });

  it("rejects a title the provider doesn't have", async () => {
    lookupMediaDetails.mockResolvedValue(null);

    const response = await POST(addRequest(validBody));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("RAWG doesn't have this title. Search for it again.");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("falls back to the submitted details when the provider can't be reached", async () => {
    lookupMediaDetails.mockRejectedValue(new Error("RAWG_API_KEY is not configured"));

    const response = await POST(addRequest(validBody));

    expect(response.status).toBe(201);
    expect(upsert.mock.calls[0]![0].create).toMatchObject({ title: "Renamed by the client" });
  });

  it("leaves an existing, recent title alone", async () => {
    mediaFindUnique.mockResolvedValue(storedItem);

    await POST(addRequest(validBody));

    expect(lookupMediaDetails).not.toHaveBeenCalled();
    expect(refreshMediaItem).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("refreshes an existing title that's over 30 days old", async () => {
    mediaFindUnique.mockResolvedValue({ ...storedItem, updatedAt: new Date("2020-01-01") });

    const response = await POST(addRequest(validBody));

    expect(response.status).toBe(201);
    expect(refreshMediaItem).toHaveBeenCalledTimes(1);
  });

  it("still adds a stale title when refreshing it fails", async () => {
    mediaFindUnique.mockResolvedValue({ ...storedItem, updatedAt: new Date("2020-01-01") });
    refreshMediaItem.mockRejectedValue(new Error("RAWG is down"));

    const response = await POST(addRequest(validBody));

    expect(response.status).toBe(201);
    expect(create.mock.calls[0]![0].data.mediaItemId).toBe("media-1");
  });

  const copy = (fields: Record<string, unknown>) => ({
    format: null,
    edition: null,
    seasons: [],
    completeSeries: false,
    ...fields,
  });
  const show = { ...validBody, source: "TMDB", externalId: "60573", mediaType: "TV", platforms: [] };

  it("saves the copies sent, with their editions and seasons", async () => {
    lookupMediaDetails.mockResolvedValue({ ...providerResult, ...show, title: "Silicon Valley" });
    const response = await POST(
      addRequest({
        ...show,
        copies: [
          { format: "Blu-Ray", edition: " Collector's Edition ", seasons: [4] },
          { format: "DVD", seasons: [5] },
          { format: "", edition: "" },
        ],
      }),
    );

    expect(create.mock.calls[0]![0].data.copies.create).toEqual([
      copy({ format: "Blu-Ray", edition: "Collector's Edition", seasons: [4] }),
      copy({ format: "DVD", seasons: [5] }),
    ]);
    const { entry } = await response.json();
    expect(entry).toMatchObject({ platforms: ["Blu-Ray", "DVD"], ownedSeasons: [4, 5] });
    expect(entry.copies).toHaveLength(2);
  });

  it("turns the older platforms and seasons fields into copies", async () => {
    await POST(addRequest(validBody));
    expect(create.mock.calls[0]![0].data.copies.create).toEqual([copy({ format: "PS2" }), copy({ format: "Xbox" })]);

    lookupMediaDetails.mockResolvedValue({ ...providerResult, ...show });
    await POST(addRequest({ ...show, platforms: ["DVD"], ownedSeasons: [5, 4, 4] }));
    expect(create.mock.calls[1]![0].data.copies.create).toEqual([copy({ format: "DVD", seasons: [4, 5] })]);
  });

  it("saves no copies to the wishlist, and no seasons for other media types", async () => {
    await POST(addRequest({ ...validBody, ownership: "WISHLIST", copies: [{ format: "PS2" }] }));
    expect(create.mock.calls[0]![0].data.copies.create).toEqual([]);

    await POST(addRequest({ ...validBody, copies: [{ format: "PS2", seasons: [1] }] }));
    expect(create.mock.calls[1]![0].data.copies.create).toEqual([copy({ format: "PS2" })]);
  });

  it("returns 409 with the existing entry when the title is already in the vault", async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const response = await POST(addRequest(validBody));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/already in your vault/);
    expect(body.entry.platforms).toEqual(["PS2"]);
  });

  it("names the wishlist when that's where the existing entry is", async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    findUnique.mockResolvedValue(progressRow({ status: "PLAN_TO_WATCH", ownership: "WISHLIST", platforms: [] }));

    const response = await POST(addRequest({ ...validBody, ownership: "WISHLIST" }));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/already on your wishlist/);
    expect(body.entry.ownership).toBe("WISHLIST");
  });

  it("rejects requests without a session", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await POST(addRequest(validBody));

    expect(response.status).toBe(401);
    expect(lookupMediaDetails).not.toHaveBeenCalled();
  });
});
