import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserId, lookupMediaDetails } = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  lookupMediaDetails: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentUserId }));
vi.mock("@/lib/external-apis", () => ({ lookupMediaDetails }));

import { GET } from "@/app/api/search/details/route";

const get = (query: string) => GET(new Request(`http://localhost/api/search/details?${query}`));

beforeEach(() => {
  getCurrentUserId.mockReset().mockResolvedValue("user-1");
  lookupMediaDetails.mockReset().mockResolvedValue({ externalId: "60573", seasonCount: 6 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/search/details", () => {
  it("returns the provider's details for one title", async () => {
    const response = await get("source=TMDB&type=tv&id=60573");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: { externalId: "60573", seasonCount: 6 } });
    expect(lookupMediaDetails).toHaveBeenCalledWith({ source: "TMDB", mediaType: "TV", externalId: "60573" });
  });

  it("requires a session and all three parameters", async () => {
    expect((await get("source=TMDB&type=tv")).status).toBe(400);
    expect((await get("source=NOPE&type=tv&id=1")).status).toBe(400);
    getCurrentUserId.mockResolvedValue(null);
    expect((await get("source=TMDB&type=tv&id=1")).status).toBe(401);
  });

  it("answers 502 when the provider can't be reached", async () => {
    lookupMediaDetails.mockRejectedValue(new Error("down"));
    expect((await get("source=TMDB&type=tv&id=1")).status).toBe(502);
  });
});
