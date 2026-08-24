/**
 * Parses a free-text list of season numbers (e.g. "1, 2, 6" or "1 2 6")
 * into a sorted, deduplicated array of positive integers. Used for
 * recording a mismatched collection — owning some seasons of a show but
 * not others — rather than a single "caught up through" season number.
 */
export function parseSeasonList(input: string): number[] {
  const seasons = input
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);

  return [...new Set(seasons)].sort((a, b) => a - b);
}

/** Formats a season list back into the editable display string, e.g. "1, 2, 6". */
export function formatSeasonList(seasons: number[]): string {
  return seasons.join(", ");
}
