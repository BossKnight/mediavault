export interface ParsedSeasonInput {
  /** Sorted, deduplicated season numbers that parsed successfully. */
  seasons: number[];
  /** Tokens that did not parse as a positive whole number, in input order. */
  invalidTokens: string[];
}

/**
 * Parses a free-text list of season numbers (e.g. "1, 2, 6" or "1 2 6"),
 * reporting both the numbers that parsed and the tokens that did not, so
 * the UI can show what was understood and flag anything it dropped instead
 * of silently ignoring it.
 */
export function parseSeasonInput(input: string): ParsedSeasonInput {
  const tokens = input
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const seasons: number[] = [];
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    const value = Number(token);
    if (Number.isInteger(value) && value > 0) {
      seasons.push(value);
    } else {
      invalidTokens.push(token);
    }
  }

  return { seasons: [...new Set(seasons)].sort((a, b) => a - b), invalidTokens };
}

/**
 * Parses a free-text list of season numbers into a sorted, deduplicated
 * array of positive integers. Used for recording a mismatched collection,
 * owning some seasons of a show but not others, rather than a single
 * "caught up through" season number.
 */
export function parseSeasonList(input: string): number[] {
  return parseSeasonInput(input).seasons;
}

/** Formats a season list back into the editable display string, e.g. "1, 2, 6". */
export function formatSeasonList(seasons: number[]): string {
  return seasons.join(", ");
}

/**
 * Seasons for display, with runs collapsed: "Season 4", "Seasons 4–5",
 * "Seasons 1–3, 6", or "Complete series". Empty when there are none.
 */
export function describeSeasons(seasons: number[], completeSeries = false): string {
  if (completeSeries) return "Complete series";
  const sorted = [...new Set(seasons)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return `Season ${sorted[0]}`;

  const runs: string[] = [];
  let start = sorted[0]!;
  let end = start;
  for (const season of [...sorted.slice(1), Number.NaN]) {
    if (season === end + 1) {
      end = season;
      continue;
    }
    runs.push(start === end ? `${start}` : `${start}–${end}`);
    start = end = season;
  }
  return `Seasons ${runs.join(", ")}`;
}
