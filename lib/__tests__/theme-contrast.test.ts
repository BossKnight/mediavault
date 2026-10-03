import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import path from "node:path";
import { THEMES } from "@/lib/theme";

// Checks every foreground/background pairing the UI uses against WCAG AA, in
// every theme, by reading the real values out of app/globals.css. A theme
// added to THEMES is picked up automatically.

type Hsl = [number, number, number];
type Tokens = Record<string, Hsl>;

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

function block(selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? null;
}

function declarations(body: string): [string, string][] {
  return [...body.matchAll(/--([\w-]+):([^;]*);/g)].map((m) => [m[1] ?? "", (m[2] ?? "").trim()]);
}

const HSL = String.raw`(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%`;
const toHsl = (m: RegExpMatchArray, offset: number): Hsl => [
  Number(m[offset] ?? NaN),
  Number(m[offset + 1] ?? NaN),
  Number(m[offset + 2] ?? NaN),
];

type Mode = "light" | "dark";

/** :root tokens resolved for one mode via the --if-light / --if-dark switches. */
function baseTokens(mode: Mode): Tokens {
  const tokens: Tokens = {};
  const pair = new RegExp(`^var\\(--if-light, ${HSL}\\) var\\(--if-dark, ${HSL}\\)$`);
  for (const [name, value] of declarations(block(":root") ?? "")) {
    const match = value.match(pair);
    if (match) tokens[name] = toHsl(match, mode === "light" ? 1 : 4);
  }
  return tokens;
}

/** A theme: its base mode's tokens with its own block's overrides applied. */
function themeTokens(theme: string): Tokens {
  const body = block(`:root.theme-${theme}`);
  if (body === null) {
    if (theme !== "light") throw new Error(`app/globals.css has no :root.theme-${theme} block`);
    return baseTokens("light");
  }
  const mode: Mode = /--if-dark:\s*initial/.test(body) ? "dark" : "light";
  const tokens = baseTokens(mode);
  for (const [name, value] of declarations(body)) {
    const match = value.match(new RegExp(`^${HSL}$`));
    if (match) tokens[name] = toHsl(match, 1);
  }
  return tokens;
}

function luminance([h, s, l]: Hsl) {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
}

function contrast(a: Hsl, b: Hsl) {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const TEXT = 4.5; // WCAG 1.4.3, normal-size text
const NON_TEXT = 3; // WCAG 1.4.11, component boundaries and focus indicators

const pageBackgrounds = ["background", "surface", "surface-raised", "muted"];

// [foreground, background, minimum ratio]
const PAIRINGS: [string, string, number][] = [
  ...pageBackgrounds.map((bg): [string, string, number] => ["foreground", bg, TEXT]),
  ["surface-foreground", "surface", TEXT],
  ["surface-foreground", "surface-raised", TEXT],
  ...pageBackgrounds.map((bg): [string, string, number] => ["muted-foreground", bg, TEXT]),
  ...["accent", "success", "warning", "danger"].flatMap((color) =>
    pageBackgrounds.map((bg): [string, string, number] => [color, bg, TEXT]),
  ),
  ["accent-foreground", "accent", TEXT],
  ["accent-foreground", "accent-hover", TEXT],
  ["accent-muted-foreground", "accent-muted", TEXT],
  // Rows just added to a list are tinted accent-muted (features/catalog/catalog-list.tsx).
  ["foreground", "accent-muted", TEXT],
  ["surface-foreground", "accent-muted", TEXT],
  ["muted-foreground", "accent-muted", TEXT],
  ["success-foreground", "success", TEXT],
  ["warning-foreground", "warning", TEXT],
  ["danger-foreground", "danger", TEXT],
  ...pageBackgrounds.map((bg): [string, string, number] => ["border", bg, NON_TEXT]),
];

describe("theme tokens", () => {
  it("parses a full token set for every theme", () => {
    for (const theme of THEMES) {
      expect(Object.keys(themeTokens(theme)).length).toBeGreaterThanOrEqual(19);
    }
  });

  it("covers every color token with at least one pairing", () => {
    const paired = new Set(PAIRINGS.flatMap(([fg, bg]) => [fg, bg]));
    const unpaired = Object.keys(baseTokens("light")).filter((name) => !paired.has(name));
    expect(unpaired).toEqual([]);
  });

  describe.each(THEMES)("%s theme", (theme) => {
    const tokens = themeTokens(theme);

    it.each(PAIRINGS)("%s on %s meets %s:1", (fg, bg, min) => {
      const [fgValue, bgValue] = [tokens[fg], tokens[bg]];
      if (!fgValue || !bgValue) throw new Error(`--${fgValue ? bg : fg} is missing`);
      expect(contrast(fgValue, bgValue)).toBeGreaterThanOrEqual(min);
    });
  });
});
