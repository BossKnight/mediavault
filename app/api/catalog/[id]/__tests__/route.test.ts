import { beforeEach, describe, expect, it, vi } from "vitest";
import { entryRow, fakeUpdate } from "@/app/api/catalog/__tests__/fake-entry";

const { findUnique, update, getCurrentUserId } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  getCurrentUserId: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { userMediaProgress: { findUnique, update } } }));
vi.mock("@/lib/session", () => ({ getCurrentUserId }));

import { PUT } from "@/app/api/catalog/[id]/route";

const put = (body: unknown) =>
  PUT(new Request("http://localhost/api/catalog/entry-1", { method: "PUT", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: "entry-1" }),
  });

const dogma = entryRow({
  mediaType: "MOVIE",
  copies: [
    { format: "Blu-Ray", edition: "Collector's Edition" },
    { format: "4K UHD", edition: "Anniversary Edition" },
  ],
});

beforeEach(() => {
  getCurrentUserId.mockReset().mockResolvedValue("user-1");
  findUnique.mockReset().mockResolvedValue(dogma);
  update.mockReset().mockImplementation(fakeUpdate(() => findUnique.mock.results[0]!.value));
});

describe("PUT /api/catalog/[id]", () => {
  it("replaces every copy when given copies", async () => {
    const response = await put({ copies: [{ format: "DVD", edition: "Criterion Collection" }] });
    const { entry } = await response.json();

    expect(update.mock.calls[0]![0].data).toMatchObject({
      copies: { deleteMany: {}, create: [{ format: "DVD", edition: "Criterion Collection", seasons: [], completeSeries: false }] },
      platforms: [],
      platform: null,
    });
    expect(entry.platforms).toEqual(["DVD"]);
  });

  it("applies an older-shape format list to the copies, keeping editions", async () => {
    await put({ platforms: ["4K UHD", "VHS"], rating: 5 });
    const data = update.mock.calls[0]![0].data;

    expect(data.rating).toBe(5);
    expect(data.copies.create).toEqual([
      { format: "4K UHD", edition: "Anniversary Edition", seasons: [], completeSeries: false },
      { format: "VHS", edition: null, seasons: [], completeSeries: false },
    ]);
  });

  it("converts an older entry on its first edit", async () => {
    findUnique.mockResolvedValue(entryRow({ mediaType: "TV", platforms: ["DVD"], ownedSeasons: [1] }));
    await put({ ownedSeasons: [1, 2], completeSeries: false });

    expect(update.mock.calls[0]![0].data.copies.create).toEqual([
      { format: "DVD", edition: null, seasons: [1, 2], completeSeries: false },
    ]);
  });

  it("leaves copies alone when the edit doesn't touch them", async () => {
    await put({ status: "COMPLETED" });
    const data = update.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("copies");
    expect(data.status).toBe("COMPLETED");
    expect(data.completedAt).toBeInstanceOf(Date);
  });

  it("finds only the user's own entries", async () => {
    findUnique.mockResolvedValue(entryRow({ userId: "someone-else" }));
    expect((await put({ status: "COMPLETED" })).status).toBe(404);
  });
});
