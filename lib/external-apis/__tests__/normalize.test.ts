import { describe, expect, it } from "vitest";
import {
  normalizeGoogleBooksVolume,
  normalizeOpenLibraryBookData,
  normalizeOpenLibrarySearchDoc,
  normalizeOpenLibraryWork,
  normalizeRawgDetails,
  normalizeRawgResult,
  normalizeTmdbDetails,
  normalizeTmdbResult,
} from "@/lib/external-apis/normalize";

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

  it("normalizes an anime TV result the same as any other TV show", () => {
    // TMDB catalogs anime as ordinary movies/TV — no separate media type or
    // special-cased provider needed, just its regular Animation genre id.
    // Attack on Titan's real TMDB entry (id 1429), genre_ids trimmed to
    // what this app maps names for.
    const result = normalizeTmdbResult(
      {
        id: 1429,
        name: "Attack on Titan",
        first_air_date: "2013-04-07",
        overview: "Centuries ago, mankind was slaughtered to near extinction...",
        poster_path: "/aiy35Evcofzl7hASZZvsFgbtSkO.jpg",
        genre_ids: [16, 10759, 10765],
      },
      "TV",
    );

    expect(result).toEqual({
      source: "TMDB",
      externalId: "1429",
      mediaType: "TV",
      title: "Attack on Titan",
      releaseDate: "2013-04-07",
      coverUrl: "https://image.tmdb.org/t/p/w500/aiy35Evcofzl7hASZZvsFgbtSkO.jpg",
      overview: "Centuries ago, mankind was slaughtered to near extinction...",
      genres: ["Animation", "Action & Adventure", "Sci-Fi & Fantasy"],
      creator: null,
    });
  });

  it("normalizes an anime movie result the same as any other movie", () => {
    // Spirited Away's real TMDB entry (id 129).
    const result = normalizeTmdbResult(
      {
        id: 129,
        title: "Spirited Away",
        release_date: "2001-07-20",
        poster_path: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
        genre_ids: [16, 10751, 14],
      },
      "MOVIE",
    );

    expect(result.mediaType).toBe("MOVIE");
    expect(result.title).toBe("Spirited Away");
    expect(result.genres).toEqual(["Animation", "Family", "Fantasy"]);
  });

  it("treats an empty release_date string as unknown, not a real date", () => {
    // TMDB returns "" (not a missing field) for some low-quality entries,
    // seen live in a real search response.
    const result = normalizeTmdbResult(
      { id: 1747666, title: "Untitled Release", release_date: "" },
      "MOVIE",
    );

    expect(result.releaseDate).toBeNull();
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
      creator: null,
      availablePlatforms: [],
    });
  });

  it("lists the game's platforms under the app's short names", () => {
    const result = normalizeRawgResult({
      id: 58175,
      name: "God of War",
      platforms: [
        { platform: { name: "PlayStation 2" } },
        { platform: { name: "Xbox Series S/X" } },
        { platform: { name: "Nintendo Switch" } },
        { platform: { name: "PC" } },
        { platform: { name: "Atari Lynx" } },
      ],
    });

    expect(result.availablePlatforms).toEqual(["PS2", "Xbox Series X|S", "Switch", "PC", "Atari Lynx"]);
  });

  it("handles a game with no genres listed", () => {
    const result = normalizeRawgResult({ id: 1, name: "Untitled Indie Game" });

    expect(result.genres).toEqual([]);
  });

  it("always returns a null creator, since RAWG search results don't include a developer", () => {
    // Confirmed against a live RAWG search response: the /games endpoint
    // never returns a `developers` field, only /games/{id} does.
    const result = normalizeRawgResult({
      id: 274755,
      name: "Hades",
      released: "2020-09-17",
      background_image: "https://media.rawg.io/media/games/1f4/1f47a270b8f241e4676b14d39ec620f7.jpg",
      genres: [{ name: "Indie" }, { name: "Action" }],
    });

    expect(result.creator).toBeNull();
  });
});

describe("normalizeOpenLibrarySearchDoc", () => {
  it("normalizes a search doc", () => {
    const result = normalizeOpenLibrarySearchDoc({
      key: "/works/OL45804W",
      title: "Fahrenheit 451",
      author_name: ["Ray Bradbury"],
      first_publish_year: 1953,
      cover_i: 8546720,
      subject: ["Fiction", "Dystopias", "Censorship"],
    });

    expect(result).toEqual({
      source: "OPENLIBRARY",
      externalId: "OL45804W",
      mediaType: "BOOK",
      title: "Fahrenheit 451",
      releaseDate: "1953-01-01",
      coverUrl: "https://covers.openlibrary.org/b/id/8546720-M.jpg",
      overview: null,
      genres: ["Fiction", "Dystopias", "Censorship"],
      creator: "Ray Bradbury",
      isbn: null,
    });
  });

  it("falls back gracefully when fields are missing", () => {
    const result = normalizeOpenLibrarySearchDoc({ key: "/works/OL1W" });

    expect(result.title).toBe("Untitled");
    expect(result.releaseDate).toBeNull();
    expect(result.coverUrl).toBeNull();
    expect(result.creator).toBeNull();
    expect(result.genres).toEqual([]);
  });

  it("caps genres at 6, since subject lists can run very long", () => {
    const result = normalizeOpenLibrarySearchDoc({
      key: "/works/OL1W",
      subject: ["A", "B", "C", "D", "E", "F", "G", "H"],
    });

    expect(result.genres).toHaveLength(6);
  });

  it("surfaces book-specific categories like comics and manga as ordinary genres", () => {
    // These aren't a separate taxonomy in this app — they're just whatever
    // subject tags Open Library returns, the same way any other genre is.
    const result = normalizeOpenLibrarySearchDoc({
      key: "/works/OL2W",
      title: "Bone: Out from Boneville",
      subject: ["Comics", "Graphic novels", "Fantasy"],
    });

    expect(result.genres).toEqual(["Comics", "Graphic novels", "Fantasy"]);
  });
});

describe("normalizeOpenLibraryBookData", () => {
  it("normalizes a single-edition ISBN lookup", () => {
    const result = normalizeOpenLibraryBookData("9780345275608", {
      key: "/books/OL2724993M",
      title: "The Hobbit",
      authors: [{ name: "J.R.R. Tolkien" }],
      publish_date: "March 1994",
      cover: { small: "small.jpg", medium: "medium.jpg", large: "large.jpg" },
      subjects: [{ name: "Fantasy fiction" }, { name: "Middle Earth" }],
    });

    expect(result).toEqual({
      source: "OPENLIBRARY",
      externalId: "OL2724993M",
      mediaType: "BOOK",
      title: "The Hobbit",
      releaseDate: "1994-01-01",
      coverUrl: "medium.jpg",
      overview: null,
      genres: ["Fantasy fiction", "Middle Earth"],
      creator: "J.R.R. Tolkien",
      isbn: "9780345275608",
    });
  });

  it("falls back to an ISBN-derived id when the edition has no key", () => {
    const result = normalizeOpenLibraryBookData("9780345275608", { title: "Untitled Edition" });

    expect(result.externalId).toBe("ISBN-9780345275608");
  });

  it("falls back gracefully when publish_date has no parseable year", () => {
    const result = normalizeOpenLibraryBookData("123", { title: "No Date", publish_date: "n.d." });

    expect(result.releaseDate).toBeNull();
  });
});

describe("normalizeGoogleBooksVolume", () => {
  it("normalizes a Google Books volume", () => {
    const result = normalizeGoogleBooksVolume("9780345275608", {
      title: "The Hobbit",
      authors: ["J.R.R. Tolkien"],
      publishedDate: "1994",
      description: "A hobbit sets out on an adventure.",
      imageLinks: { thumbnail: "http://books.google.com/cover.jpg" },
      categories: ["Fiction / Fantasy"],
    });

    expect(result).toEqual({
      source: "OPENLIBRARY",
      externalId: "ISBN-9780345275608",
      mediaType: "BOOK",
      title: "The Hobbit",
      releaseDate: "1994-01-01",
      coverUrl: "https://books.google.com/cover.jpg",
      overview: "A hobbit sets out on an adventure.",
      genres: ["Fiction / Fantasy"],
      creator: "J.R.R. Tolkien",
      isbn: "9780345275608",
    });
  });

  it("upgrades an http cover thumbnail to https", () => {
    const result = normalizeGoogleBooksVolume("1", {
      imageLinks: { thumbnail: "http://books.google.com/cover.jpg" },
    });

    expect(result.coverUrl).toBe("https://books.google.com/cover.jpg");
  });
});

describe("normalizeTmdbDetails", () => {
  it("reads genre names from the details payload's genre objects", () => {
    const result = normalizeTmdbDetails(
      {
        id: 1399,
        name: "Game of Thrones",
        first_air_date: "2011-04-17",
        overview: "Seven noble families fight for control.",
        poster_path: "/got.jpg",
        genres: [{ name: "Sci-Fi & Fantasy" }, { name: "Drama" }],
      },
      "TV",
    );

    expect(result).toMatchObject({
      source: "TMDB",
      externalId: "1399",
      mediaType: "TV",
      title: "Game of Thrones",
      releaseDate: "2011-04-17",
      coverUrl: "https://image.tmdb.org/t/p/w500/got.jpg",
      genres: ["Sci-Fi & Fantasy", "Drama"],
    });
  });
});

describe("normalizeRawgDetails", () => {
  it("adds the description and first developer that search results lack", () => {
    const result = normalizeRawgDetails({
      id: 5286,
      name: "Destroy All Humans!",
      released: "2005-06-21",
      background_image: "https://media.rawg.io/dah.jpg",
      genres: [{ name: "Action" }],
      description_raw: "  Play as Crypto, an alien invader.  ",
      developers: [{ name: "Pandemic Studios" }, { name: "Other" }],
    });

    expect(result).toMatchObject({
      externalId: "5286",
      overview: "Play as Crypto, an alien invader.",
      creator: "Pandemic Studios",
      genres: ["Action"],
      availablePlatforms: [],
    });
  });

  it("leaves overview and creator null when RAWG has neither", () => {
    const result = normalizeRawgDetails({ id: 1, name: "Bare", description_raw: "  " });
    expect(result.overview).toBeNull();
    expect(result.creator).toBeNull();
  });
});

describe("normalizeOpenLibraryWork", () => {
  it("reads an object description, the first real cover and the author", () => {
    const result = normalizeOpenLibraryWork(
      "OL893415W",
      {
        title: "Dune",
        description: { value: "Arrakis, the desert planet." },
        covers: [-1, 11481354],
        subjects: ["Science fiction", "Deserts", "Ecology", "Politics", "Religion", "Spice", "Extra"],
        first_publish_date: "August 1965",
      },
      "Frank Herbert",
    );

    expect(result).toEqual({
      source: "OPENLIBRARY",
      externalId: "OL893415W",
      mediaType: "BOOK",
      title: "Dune",
      releaseDate: "1965-01-01",
      coverUrl: "https://covers.openlibrary.org/b/id/11481354-M.jpg",
      overview: "Arrakis, the desert planet.",
      genres: ["Science fiction", "Deserts", "Ecology", "Politics", "Religion", "Spice"],
      creator: "Frank Herbert",
      isbn: null,
    });
  });

  it("accepts a plain string description and a work with no covers", () => {
    const result = normalizeOpenLibraryWork("OL1W", { title: "X", description: "Plain." }, null);
    expect(result.overview).toBe("Plain.");
    expect(result.coverUrl).toBeNull();
  });
});
