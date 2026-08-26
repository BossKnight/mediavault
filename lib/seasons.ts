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
