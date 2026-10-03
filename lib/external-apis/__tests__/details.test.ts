import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupMediaDetails } from "@/lib/external-apis";

const fetchMock = vi.fn();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function requestedUrl(call = 0): URL {
  return new URL(String(fetchMock.mock.calls[call]![0]));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TMDB_API_KEY", "tmdb-key");
  vi.stubEnv("RAWG_API_KEY", "rawg-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("lookupMediaDetails", () => {
  it("fetches a movie from TMDB's movie endpoint", async () => {
    fetchMock.mockResolvedValue(json({ id: 603, title: "The Matrix", genres: [{ name: "Action" }] }));

    const result = await lookupMediaDetails({ source: "TMDB", externalId: "603", mediaType: "MOVIE" });

    expect(requestedUrl().pathname).toBe("/3/movie/603");
    expect(requestedUrl().searchParams.get("api_key")).toBe("tmdb-key");
    expect(result).toMatchObject({ title: "The Matrix", genres: ["Action"] });
  });

  it("uses TMDB's tv endpoint for shows", async () => {
    fetchMock.mockResolvedValue(json({ id: 1399, name: "Game of Thrones" }));

    await lookupMediaDetails({ source: "TMDB", externalId: "1399", mediaType: "TV" });

    expect(requestedUrl().pathname).toBe("/3/tv/1399");
  });

  it("fetches a game's details from RAWG", async () => {
    fetchMock.mockResolvedValue(json({ id: 5286, name: "Destroy All Humans!", developers: [{ name: "Pandemic" }] }));

    const result = await lookupMediaDetails({ source: "RAWG", externalId: "5286", mediaType: "GAME" });

    expect(requestedUrl().pathname).toBe("/api/games/5286");
    expect(result?.creator).toBe("Pandemic");
  });

  it("returns null when the provider has no such title", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Not found." }, 404));

    expect(await lookupMediaDetails({ source: "RAWG", externalId: "999", mediaType: "GAME" })).toBeNull();
  });

  it("returns null when the provider answers with a different title", async () => {
    fetchMock.mockResolvedValue(json({ id: 1, name: "Something else" }));

    expect(await lookupMediaDetails({ source: "RAWG", externalId: "5286", mediaType: "GAME" })).toBeNull();
  });

  it("returns null for a source and media type that don't go together", async () => {
    expect(await lookupMediaDetails({ source: "RAWG", externalId: "5286", mediaType: "MOVIE" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when the provider errors, so callers can tell it apart from not found", async () => {
    fetchMock.mockResolvedValue(json({}, 503));

    await expect(lookupMediaDetails({ source: "TMDB", externalId: "603", mediaType: "MOVIE" })).rejects.toThrow();
  });

  it("throws when the provider's API key isn't configured", async () => {
    vi.stubEnv("RAWG_API_KEY", "");

    await expect(lookupMediaDetails({ source: "RAWG", externalId: "1", mediaType: "GAME" })).rejects.toThrow(
      "RAWG_API_KEY is not configured",
    );
  });

  it("fetches an Open Library work and its first author", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ title: "Dune", authors: [{ author: { key: "/authors/OL79034A" } }] }))
      .mockResolvedValueOnce(json({ name: "Frank Herbert" }));

    const result = await lookupMediaDetails({ source: "OPENLIBRARY", externalId: "OL893415W", mediaType: "BOOK" });

    expect(requestedUrl(0).pathname).toBe("/works/OL893415W.json");
    expect(requestedUrl(1).pathname).toBe("/authors/OL79034A.json");
    expect(result).toMatchObject({ title: "Dune", creator: "Frank Herbert" });
  });

  it("doesn't follow an author key of an unexpected shape", async () => {
    fetchMock.mockResolvedValueOnce(json({ title: "Dune", authors: [{ author: { key: "//evil.example/x" } }] }));

    const result = await lookupMediaDetails({ source: "OPENLIBRARY", externalId: "OL893415W", mediaType: "BOOK" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result?.creator).toBeNull();
  });

  it("looks a barcode-scanned book up by the ISBN in its id", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ "ISBN:9780441172719": { key: "/books/OL7353617M", title: "Dune", cover: { medium: "c.jpg" } } }),
    );
    fetchMock.mockResolvedValue(json({}));

    const result = await lookupMediaDetails({ source: "OPENLIBRARY", externalId: "OL7353617M", mediaType: "BOOK", isbn: "978-0-441-17271-9" });

    expect(requestedUrl(0).searchParams.get("bibkeys")).toBe("ISBN:9780441172719");
    expect(result).toMatchObject({ externalId: "OL7353617M", isbn: "9780441172719" });
  });

  it("throws for an Open Library edition with no ISBN to look it up by", async () => {
    await expect(
      lookupMediaDetails({ source: "OPENLIBRARY", externalId: "OL7353617M", mediaType: "BOOK" }),
    ).rejects.toThrow();
  });
});
