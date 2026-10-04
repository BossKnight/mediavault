import { describe, expect, it } from "vitest";
import {
  applyLegacyEdit,
  cleanCopies,
  copiesInputSchema,
  copiesSummary,
  legacyCopies,
  MAX_COPIES,
  replaceCopiesData,
  type CopyFields,
} from "@/lib/copies";

const copy = (fields: Partial<CopyFields>): CopyFields => ({
  format: null,
  edition: null,
  seasons: [],
  completeSeries: false,
  ...fields,
});
const legacy = (fields: Partial<Parameters<typeof legacyCopies>[0]>) => ({
  platforms: [],
  platform: null,
  ownedSeasons: [],
  completeSeries: false,
  ...fields,
});

describe("copiesInputSchema", () => {
  it("tidies what's sent: short platform names, trimmed editions, sorted seasons, blanks as null", () => {
    expect(
      copiesInputSchema.parse([
        { format: " PlayStation 2 ", edition: "  Greatest Hits ", seasons: [5, 4, 4] },
        { format: "", edition: "   " },
      ]),
    ).toEqual([
      { format: "PS2", edition: "Greatest Hits", seasons: [4, 5], completeSeries: false },
      { format: null, edition: null, seasons: [], completeSeries: false },
    ]);
  });

  it("limits copies and edition length", () => {
    expect(copiesInputSchema.safeParse(Array(MAX_COPIES + 1).fill({ format: "DVD" })).success).toBe(false);
    expect(copiesInputSchema.safeParse([{ edition: "x".repeat(81) }]).success).toBe(false);
  });
});

describe("cleanCopies", () => {
  it("keeps seasons for TV only, drops the list for a complete series, and drops empty copies", () => {
    expect(cleanCopies([copy({ format: "DVD", seasons: [1] }), copy({})], "MOVIE")).toEqual([copy({ format: "DVD" })]);
    expect(cleanCopies([copy({ format: "DVD", seasons: [2], completeSeries: true })], "TV")).toEqual([
      copy({ format: "DVD", completeSeries: true }),
    ]);
  });
});

describe("legacyCopies", () => {
  it("makes one copy per stored format, including the single legacy value", () => {
    expect(legacyCopies(legacy({ platforms: ["Blu-Ray", "4K UHD"] }), "MOVIE")).toEqual({
      copies: [copy({ format: "Blu-Ray" }), copy({ format: "4K UHD" })],
      seasonsGuessed: false,
    });
    expect(legacyCopies(legacy({ platform: "PS2" }), "GAME").copies).toEqual([copy({ format: "PS2" })]);
  });

  it("puts a show's seasons on its only copy, or on a copy with no format", () => {
    expect(legacyCopies(legacy({ platforms: ["DVD"], ownedSeasons: [4, 5] }), "TV").copies).toEqual([
      copy({ format: "DVD", seasons: [4, 5] }),
    ]);
    expect(legacyCopies(legacy({ completeSeries: true }), "TV").copies).toEqual([copy({ completeSeries: true })]);
  });

  it("guesses the first copy when several formats share the seasons, and says so", () => {
    expect(legacyCopies(legacy({ platforms: ["Blu-Ray", "DVD"], ownedSeasons: [4, 5] }), "TV")).toEqual({
      copies: [copy({ format: "Blu-Ray", seasons: [4, 5] }), copy({ format: "DVD" })],
      seasonsGuessed: true,
    });
  });

  it("has nothing for an entry with nothing recorded", () => {
    expect(legacyCopies(legacy({}), "TV")).toEqual({ copies: [], seasonsGuessed: false });
  });
});

describe("copiesSummary", () => {
  it("lists every format once and every season held", () => {
    expect(
      copiesSummary([
        copy({ format: "Blu-Ray", edition: "Collector's Edition", seasons: [4] }),
        copy({ format: "DVD", seasons: [5] }),
        copy({ format: "blu-ray", edition: "Steelbook" }),
      ]),
    ).toEqual({ platforms: ["Blu-Ray", "DVD"], ownedSeasons: [4, 5], completeSeries: false });
    expect(copiesSummary([copy({ completeSeries: true }), copy({ seasons: [1] })])).toEqual({
      platforms: [],
      ownedSeasons: [],
      completeSeries: true,
    });
  });
});

describe("applyLegacyEdit", () => {
  const dogma = [
    copy({ format: "Blu-Ray", edition: "Collector's Edition" }),
    copy({ format: "4K UHD", edition: "Anniversary Edition" }),
  ];

  it("keeps the editions of formats still listed, drops the rest, and adds new ones", () => {
    expect(applyLegacyEdit(dogma, { platforms: ["4K UHD", "DVD"] }, "MOVIE")).toEqual([
      copy({ format: "4K UHD", edition: "Anniversary Edition" }),
      copy({ format: "DVD" }),
    ]);
  });

  it("leaves which copy holds which seasons alone when the seasons didn't change", () => {
    const show = [copy({ format: "Blu-Ray", seasons: [4] }), copy({ format: "DVD", seasons: [5] })];
    expect(applyLegacyEdit(show, { ownedSeasons: [5, 4], completeSeries: false }, "TV")).toEqual(show);
  });

  it("puts changed seasons on the first copy", () => {
    const show = [copy({ format: "Blu-Ray", seasons: [4] }), copy({ format: "DVD", seasons: [5] })];
    expect(applyLegacyEdit(show, { ownedSeasons: [1, 2] }, "TV")).toEqual([
      copy({ format: "Blu-Ray", seasons: [1, 2] }),
      copy({ format: "DVD" }),
    ]);
    expect(applyLegacyEdit([], { ownedSeasons: [3] }, "TV")).toEqual([copy({ seasons: [3] })]);
  });
});

describe("replaceCopiesData", () => {
  it("replaces every copy and clears the older fields", () => {
    expect(replaceCopiesData([copy({ format: "DVD" })])).toEqual({
      copies: { deleteMany: {}, create: [copy({ format: "DVD" })] },
      platforms: [],
      platform: null,
      ownedSeasons: [],
      completeSeries: false,
    });
  });
});
