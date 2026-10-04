import { z } from "zod";
import { MAX_PLATFORM_LENGTH, canonicalPlatform, normalizePlatforms, storedPlatforms } from "@/lib/platforms";
import type { MediaType } from "@/types/media";

/** Most copies one entry can hold. */
export const MAX_COPIES = 20;
/** Longest edition name. */
export const MAX_EDITION_LENGTH = 80;

/** A copy's own fields, as stored (lib/catalog.ts adds the id). */
export interface CopyFields {
  format: string | null;
  edition: string | null;
  seasons: number[];
  completeSeries: boolean;
}

const sortedUnique = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

/** One copy as the API accepts it. Blank strings mean "not set". */
export const copyInputSchema = z.object({
  format: z
    .string()
    .max(MAX_PLATFORM_LENGTH, `Keep each format or platform under ${MAX_PLATFORM_LENGTH} characters`)
    .nullable()
    .optional()
    .transform((value) => (value?.trim() ? canonicalPlatform(value) : null)),
  edition: z
    .string()
    .max(MAX_EDITION_LENGTH, `Keep each edition under ${MAX_EDITION_LENGTH} characters`)
    .nullable()
    .optional()
    .transform((value) => value?.trim() || null),
  seasons: z
    .array(z.number().int().min(1).max(500))
    .max(500)
    .optional()
    .transform((value) => sortedUnique(value ?? [])),
  completeSeries: z
    .boolean()
    .optional()
    .transform((value) => value ?? false),
});

export const copiesInputSchema = z
  .array(copyInputSchema)
  .max(MAX_COPIES, `List at most ${MAX_COPIES} copies`);

/**
 * Tidies copies for a title: seasons only apply to TV ("complete series"
 * means every season, so no list with it), and copies with nothing
 * recorded at all are dropped, so a blank row in a form saves nothing.
 */
export function cleanCopies(copies: CopyFields[], mediaType: MediaType): CopyFields[] {
  return copies
    .map((copy) => {
      const isTv = mediaType === "TV";
      const completeSeries = isTv && copy.completeSeries;
      return {
        format: copy.format,
        edition: copy.edition,
        seasons: isTv && !completeSeries ? sortedUnique(copy.seasons) : [],
        completeSeries,
      };
    })
    .filter((copy) => copy.format || copy.edition || copy.seasons.length > 0 || copy.completeSeries);
}

/** The fields entries had before copies existed. */
export interface LegacyCopyFields {
  platforms: string[];
  platform: string | null;
  ownedSeasons: number[];
  completeSeries: boolean;
}

/**
 * Copies for an entry saved before copies existed: one per recorded format.
 * A TV show's seasons go on its only copy (or a copy with no format, when
 * none was recorded). With several formats there's no telling which copy
 * holds them, so they go on the first, and `seasonsGuessed` says so.
 */
export function legacyCopies(
  row: LegacyCopyFields,
  mediaType: MediaType,
): { copies: CopyFields[]; seasonsGuessed: boolean } {
  const formats = storedPlatforms(row);
  const hasSeasons = mediaType === "TV" && (row.completeSeries || row.ownedSeasons.length > 0);
  const seasonFields = { seasons: row.ownedSeasons, completeSeries: row.completeSeries };

  if (formats.length === 0) {
    const copies = hasSeasons ? [{ format: null, edition: null, ...seasonFields }] : [];
    return { copies: cleanCopies(copies, mediaType), seasonsGuessed: false };
  }

  const copies = formats.map((format, index) => ({
    format,
    edition: null,
    ...(index === 0 && hasSeasons ? seasonFields : { seasons: [], completeSeries: false }),
  }));
  return { copies: cleanCopies(copies, mediaType), seasonsGuessed: hasSeasons && formats.length > 1 };
}

/**
 * What an entry's copies add up to, in the fields the rest of the app
 * already reads: every format once, and the seasons held by any copy
 * ("complete series" if any copy is a full set).
 */
export function copiesSummary(copies: CopyFields[]): {
  platforms: string[];
  ownedSeasons: number[];
  completeSeries: boolean;
} {
  const completeSeries = copies.some((copy) => copy.completeSeries);
  return {
    platforms: normalizePlatforms(copies.flatMap((copy) => (copy.format ? [copy.format] : []))),
    ownedSeasons: completeSeries ? [] : sortedUnique(copies.flatMap((copy) => copy.seasons)),
    completeSeries,
  };
}

/**
 * Applies an edit made in the older shape (a format list and an entry-wide
 * season list, as Item Detail still sends) to an entry's copies, keeping
 * what that shape can't express: editions, and which copy holds which
 * seasons, unless the seasons themselves changed.
 */
export function applyLegacyEdit(
  copies: CopyFields[],
  edit: { platforms?: string[]; ownedSeasons?: number[]; completeSeries?: boolean },
  mediaType: MediaType,
): CopyFields[] {
  let next = copies.map((copy) => ({ ...copy, seasons: [...copy.seasons] }));

  if (edit.platforms) {
    const wanted = normalizePlatforms(edit.platforms);
    const key = (format: string) => format.toLowerCase();
    const wantedKeys = new Set(wanted.map(key));
    next = next.filter((copy) => copy.format === null || wantedKeys.has(key(copy.format)));
    const haveKeys = new Set(next.flatMap((copy) => (copy.format ? [key(copy.format)] : [])));
    for (const format of wanted) {
      if (!haveKeys.has(key(format))) {
        next.push({ format, edition: null, seasons: [], completeSeries: false });
      }
    }
  }

  if (mediaType === "TV" && (edit.ownedSeasons !== undefined || edit.completeSeries !== undefined)) {
    const current = copiesSummary(next);
    const completeSeries = edit.completeSeries ?? current.completeSeries;
    const seasons = completeSeries ? [] : sortedUnique(edit.ownedSeasons ?? current.ownedSeasons);
    const unchanged =
      completeSeries === current.completeSeries &&
      seasons.join(",") === current.ownedSeasons.join(",");
    if (!unchanged) {
      next = next.map((copy) => ({ ...copy, seasons: [], completeSeries: false }));
      if (next.length === 0) next.push({ format: null, edition: null, seasons: [], completeSeries: false });
      next[0] = { ...next[0]!, seasons, completeSeries };
    }
  }

  return cleanCopies(next, mediaType);
}

/**
 * Prisma update data that replaces an entry's copies, and clears the older
 * fields so they can't disagree with the copies (reads ignore them once
 * copies exist).
 */
export function replaceCopiesData(copies: CopyFields[]) {
  return {
    copies: { deleteMany: {}, create: copies },
    platforms: [],
    platform: null,
    ownedSeasons: [],
    completeSeries: false,
  };
}
