/** Most platforms or formats one vault entry can list. */
export const MAX_PLATFORMS = 10;
/** Longest single platform or format name. */
export const MAX_PLATFORM_LENGTH = 60;

/**
 * Cleans a list of platforms or formats: trims each, drops blanks, and drops
 * repeats regardless of case, keeping the first spelling and the order.
 */
export function normalizePlatforms(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/** "PS2, Xbox,  ps2" -> ["PS2", "Xbox"] */
export function parsePlatformList(text: string): string[] {
  return normalizePlatforms(text.split(","));
}

/**
 * The platforms to show for a stored entry. Entries saved before platforms
 * became a list only have the single legacy `platform` value; it's read as
 * a one-item list until the entry is next saved, which moves it over.
 */
export function storedPlatforms(row: { platforms: string[]; platform: string | null }): string[] {
  if (row.platforms.length > 0) return row.platforms;
  return row.platform ? [row.platform] : [];
}
