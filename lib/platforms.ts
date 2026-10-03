/** Most platforms or formats one vault entry can list. */
export const MAX_PLATFORMS = 10;
/** Longest single platform or format name. */
export const MAX_PLATFORM_LENGTH = 60;

// The short names the app uses for game platforms, by the lowercase names
// RAWG and people use for them ("PlayStation 2", "playstation 2", "PS2"
// all become "PS2"), so one console doesn't end up under three spellings.
const GAME_PLATFORM_NAMES: Record<string, string> = {
  "playstation 5": "PS5",
  ps5: "PS5",
  "playstation 4": "PS4",
  ps4: "PS4",
  "playstation 3": "PS3",
  ps3: "PS3",
  "playstation 2": "PS2",
  ps2: "PS2",
  playstation: "PS1",
  "playstation 1": "PS1",
  ps1: "PS1",
  psx: "PS1",
  "ps vita": "PS Vita",
  "playstation vita": "PS Vita",
  psp: "PSP",
  "xbox series s/x": "Xbox Series X|S",
  "xbox series x/s": "Xbox Series X|S",
  "xbox series x|s": "Xbox Series X|S",
  "xbox series x": "Xbox Series X|S",
  "xbox series s": "Xbox Series X|S",
  "xbox one": "Xbox One",
  "xbox 360": "Xbox 360",
  xbox: "Xbox",
  "nintendo switch 2": "Switch 2",
  "switch 2": "Switch 2",
  "nintendo switch": "Switch",
  switch: "Switch",
  "wii u": "Wii U",
  wii: "Wii",
  gamecube: "GameCube",
  "nintendo gamecube": "GameCube",
  "nintendo 64": "N64",
  n64: "N64",
  "nintendo 3ds": "3DS",
  "3ds": "3DS",
  "nintendo ds": "DS",
  "game boy advance": "GBA",
  gba: "GBA",
  "game boy color": "GBC",
  gbc: "GBC",
  "game boy": "Game Boy",
  snes: "SNES",
  "super nintendo": "SNES",
  nes: "NES",
  pc: "PC",
  windows: "PC",
  macos: "Mac",
  mac: "Mac",
  linux: "Linux",
  ios: "iOS",
  android: "Android",
  "sega genesis": "Genesis",
  "mega drive": "Genesis",
  genesis: "Genesis",
  dreamcast: "Dreamcast",
  "sega saturn": "Saturn",
};

/** Offered for a game when its own platform list isn't known. */
export const COMMON_GAME_PLATFORMS = ["PS5", "PS4", "Xbox Series X|S", "Xbox One", "Switch", "PC"];

/** "PlayStation 2" -> "PS2". Names it doesn't know (and formats) pass through. */
export function canonicalPlatform(name: string): string {
  const trimmed = name.trim();
  return GAME_PLATFORM_NAMES[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * Cleans a list of platforms or formats: trims each, maps known game
 * platforms to their short names, drops blanks, and drops repeats
 * regardless of case, keeping the first spelling and the order.
 */
export function normalizePlatforms(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = canonicalPlatform(value);
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
