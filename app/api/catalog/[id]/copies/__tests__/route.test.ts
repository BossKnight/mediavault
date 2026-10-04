import { beforeEach, describe, expect, it, vi } from "vitest";
import { entryRow, fakeUpdate } from "@/app/api/catalog/__tests__/fake-entry";

const { findUnique, update, getCurrentUserId } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  getCurrentUserId: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { userMediaProgress: { findUnique, update } } }));
vi.mock("@/lib/session", () => ({ getCurrentUserId }));

import { POST } from "@/app/api/catalog/[id]/copies/route";

const add = (body: unknown) =>
  POST(new Request("http://localhost/api/catalog/entry-1/copies", { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: "entry-1" }),
  });

beforeEach(() => {
  getCurrentUserId.mockReset().mockResolvedValue("user-1");
  findUnique.mockReset().mockResolvedValue(entryRow({ copies: [{ format: "Blu-Ray", edition: "Collector's Edition" }] }));
  update.mockReset().mockImplementation(fakeUpdate(() => findUnique.mock.results[0]!.value));
});

describe("POST /api/catalog/[id]/copies", () => {
  it("adds copies and keeps the ones already stored", async () => {
    const response = await add({ copies: [{ format: "4K UHD", edition: "Anniversary Edition" }] });
    expect(response.status).toBe(201);

    expect(update.mock.calls[0]![0].data).toEqual({
      copies: { create: [{ format: "4K UHD", edition: "Anniversary Edition", seasons: [], completeSeries: false }] },
    });
    const { entry } = await response.json();
    expect(entry.copies.map((copy: { edition: string }) => copy.edition)).toEqual([
      "Collector's Edition",
      "Anniversary Edition",
    ]);
  });

  it("saves an older entry's formats as copies first, so they aren't hidden", async () => {
    findUnique.mockResolvedValue(entryRow({ platforms: ["Blu-Ray"] }));
    await add({ copies: [{ format: "4K UHD" }] });

    expect(update.mock.calls[0]![0].data).toMatchObject({
      copies: {
        deleteMany: {},
        create: [
          { format: "Blu-Ray", edition: null, seasons: [], completeSeries: false },
          { format: "4K UHD", edition: null, seasons: [], completeSeries: false },
        ],
      },
      platforms: [],
    });
  });

  it("refuses wishlist entries, empty copies, and going over the limit", async () => {
    expect((await add({ copies: [{ format: "", edition: " " }] })).status).toBe(400);
    expect((await add({ copies: [] })).status).toBe(400);

    findUnique.mockResolvedValue(entryRow({ copies: Array(20).fill({ format: "DVD" }) }));
    expect((await add({ copies: [{ format: "DVD" }] })).status).toBe(400);

    findUnique.mockResolvedValue(entryRow({ ownership: "WISHLIST" }));
    const response = await add({ copies: [{ format: "DVD" }] });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/wishlist/);
    expect(update).not.toHaveBeenCalled();
  });

  it("finds only the user's own entries", async () => {
    findUnique.mockResolvedValue(entryRow({ userId: "someone-else" }));
    expect((await add({ copies: [{ format: "DVD" }] })).status).toBe(404);
  });
});
