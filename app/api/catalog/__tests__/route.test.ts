import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsert, create, findUnique, getCurrentUserId } = vi.hoisted(() => ({
  upsert: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  getCurrentUserId: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { mediaItem: { upsert }, userMediaProgress: { create, findUnique } },
}));
vi.mock("@/lib/session", () => ({ getCurrentUserId }));

import { POST } from "@/app/api/catalog/route";

const mediaItem = {
  id: "media-1",
  source: "RAWG",
  externalId: "1",
  mediaType: "GAME",
  title: "Destroy All Humans!",
  releaseDate: null,
  coverUrl: null,
  overview: null,
  genres: [],
  creator: null,
  isbn: null,
};

function progressRow(data: Record<string, unknown>) {
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
    ...data,
    mediaItem,
  };
}

function addRequest(body: unknown) {
  return new Request("http://localhost/api/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  source: "RAWG",
  externalId: "1",
  mediaType: "GAME",
  title: "Destroy All Humans!",
  platforms: ["PS2", " ps2 ", "Xbox"],
};

beforeEach(() => {
  getCurrentUserId.mockReset().mockResolvedValue("user-1");
  upsert.mockReset().mockResolvedValue(mediaItem);
  create.mockReset().mockImplementation(async ({ data }) => progressRow(data));
  findUnique.mockReset().mockResolvedValue(progressRow({ status: "PLAN_TO_WATCH", ownership: "OWNED", platforms: ["PS2"] }));
});

describe("POST /api/catalog", () => {
  it("never changes an existing shared MediaItem", async () => {
    await POST(addRequest({ ...validBody, title: "Renamed by someone else", coverUrl: "https://evil.example/x.png" }));

    expect(upsert.mock.calls[0]![0].update).toEqual({});
  });

  it("still creates a new MediaItem from the request", async () => {
    await POST(addRequest(validBody));

    expect(upsert.mock.calls[0]![0].create).toMatchObject({
      source: "RAWG",
      externalId: "1",
      title: "Destroy All Humans!",
    });
  });

  it("saves the platforms trimmed and de-duplicated", async () => {
    const response = await POST(addRequest(validBody));

    expect(response.status).toBe(201);
    expect(create.mock.calls[0]![0].data.platforms).toEqual(["PS2", "Xbox"]);
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

  it("rejects requests without a session", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await POST(addRequest(validBody));

    expect(response.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });
});
