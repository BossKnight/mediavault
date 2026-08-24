import { describe, expect, it } from "vitest";
import { normalizeRawgResult, normalizeTmdbResult } from "@/lib/external-apis/normalize";

describe("normalizeTmdbResult", () => {
  it("normalizes a movie result", () => {
    const result = normalizeTmdbResult(
      {
        id: 27205,
        title: "Inception",
        release_date: "2010-07-16",
        overview: "A thief who steals corporate secrets...",
        poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
        genre_ids: [28, 878],
      },
      "MOVIE",
    );

    expect(result).toEqual({
      source: "TMDB",
      externalId: "27205",
      mediaType: "MOVIE",
      title: "Inception",
      releaseDate: "2010-07-16",
      coverUrl: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
      overview: "A thief who steals corporate secrets...",
      genres: ["Action", "Science Fiction"],
      creator: null,
    });
  });

  it("normalizes a TV result using name and first_air_date", () => {
    const result = normalizeTmdbResult(
      {
        id: 1399,
        name: "Game of Thrones",
        first_air_date: "2011-04-17",
        poster_path: null,
        genre_ids: [],
      },
      "TV",
    );

    expect(result.title).toBe("Game of Thrones");
    expect(result.releaseDate).toBe("2011-04-17");
    expect(result.coverUrl).toBeNull();
    expect(result.genres).toEqual([]);
  });

  it("falls back gracefully when fields are missing", () => {
    const result = normalizeTmdbResult({ id: 1 }, "MOVIE");

    expect(result.title).toBe("Untitled");
    expect(result.releaseDate).toBeNull();
    expect(result.coverUrl).toBeNull();
    expect(result.overview).toBeNull();
    expect(result.genres).toEqual([]);
  });

  it("drops unknown genre ids instead of producing undefined entries", () => {
    const result = normalizeTmdbResult(
      { id: 1, title: "Mystery Movie", genre_ids: [28, 999999] },
      "MOVIE",
    );

    expect(result.genres).toEqual(["Action"]);
  });
});

describe("normalizeRawgResult", () => {
  it("normalizes a game result", () => {
    const result = normalizeRawgResult({
      id: 3498,
      name: "Grand Theft Auto V",
      released: "2013-09-17",
      background_image: "https://media.rawg.io/media/games/gta-v.jpg",
      genres: [{ name: "Action" }, { name: "Adventure" }],
      developers: [{ name: "Rockstar North" }],
    });

    expect(result).toEqual({
      source: "RAWG",
      externalId: "3498",
      mediaType: "GAME",
      title: "Grand Theft Auto V",
      releaseDate: "2013-09-17",
      coverUrl: "https://media.rawg.io/media/games/gta-v.jpg",
      overview: null,
      genres: ["Action", "Adventure"],
      creator: "Rockstar North",
    });
  });

  it("handles a game with no developer or genres listed", () => {
    const result = normalizeRawgResult({ id: 1, name: "Untitled Indie Game" });

    expect(result.creator).toBeNull();
    expect(result.genres).toEqual([]);
  });
});
