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

const IF_MODE = /^var\(--if-light, (.+?)\) var\(--if-dark, (.+)\)$/;
const REF = /^var\(--([\w-]+)\)$/;
const LITERAL = new RegExp(`^${HSL}$`);

/**
 * Resolves one declared value for a mode: picks the --if-light/--if-dark
 * branch, follows var(--token) references, and parses the HSL triple.
 */
function resolve(value: string, mode: Mode, declared: Map<string, string>, seen: string[] = []): Hsl {
  const branch = value.match(IF_MODE);
  if (branch) return resolve((mode === "light" ? branch[1] : branch[2]) ?? "", mode, declared, seen);
  const ref = value.match(REF);
  if (ref) {
    const name = ref[1] ?? "";
    const target = declared.get(name);
    if (target === undefined || seen.includes(name)) throw new Error(`Can't resolve --${name}`);
    return resolve(target, mode, declared, [...seen, name]);
  }
  const literal = value.match(LITERAL);
  if (!literal) throw new Error(`Unparsed value "${value}"`);
  return toHsl(literal, 1);
}

/**
 * A theme's tokens: the :root declarations, with its own block's overrides
 * (palette steps or semantic tokens) applied, resolved in its base mode.
 */
function resolveTokens(mode: Mode, overrides: [string, string][] = []): Tokens {
  // Colors only: skip the mode switches and sizes like --radius-card.
  const isColor = ([name]: [string, string]) => !name.startsWith("if-") && !name.startsWith("radius-");
  const declared = new Map(declarations(block(":root") ?? "").filter(isColor));
  for (const [name, value] of overrides.filter(isColor)) declared.set(name, value);
  return Object.fromEntries([...declared.keys()].map((name) => [name, resolve(declared.get(name)!, mode, declared)]));
}

const baseTokens = (mode: Mode) => resolveTokens(mode);

function themeTokens(theme: string): Tokens {
  const body = block(`:root.theme-${theme}`);
  if (body === null) {
    if (theme !== "light") throw new Error(`app/globals.css has no :root.theme-${theme} block`);
    return baseTokens("light");
  }
  const mode: Mode = /--if-dark:\s*initial/.test(body) ? "dark" : "light";
  return resolveTokens(mode, declarations(body));
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
  // Badges (components/ui/badge.tsx), also shown over cover art.
  ["success-muted-foreground", "success-muted", TEXT],
  ["warning-muted-foreground", "warning-muted", TEXT],
  ["danger-muted-foreground", "danger-muted", TEXT],
  ["warning-foreground", "warning", TEXT],
  ["danger-foreground", "danger", TEXT],
  ...pageBackgrounds.map((bg): [string, string, number] => ["border", bg, NON_TEXT]),
];

// The palette's own intended pairings (--color-*), so a step changed in a
// later edit can't quietly break a combination components may adopt.
// Semantic shades: -dark is text, -light the tinted background, -default
// the fill or icon. Warning's amber -default is fill-only in light mode
// (with dark text on it), so it has no "on the page" row.
const ON_FILL: Record<Mode, string> = { light: "color-white", dark: "color-neutral-50" };
const PALETTE_SURFACES: Record<Mode, string[]> = {
  light: ["color-white", "color-neutral-50", "color-neutral-100"],
  dark: ["color-neutral-50", "color-neutral-100", "color-neutral-200"],
};
const STATUSES = ["success", "warning", "error", "info"];
function palettePairings(mode: Mode): [string, string, number][] {
  const onSurfaces = (fg: string, min: number) =>
    PALETTE_SURFACES[mode].map((bg): [string, string, number] => [fg, bg, min]);
  return [
    ...["neutral-900", "neutral-700", "neutral-600", "primary-600", "secondary-600"].flatMap((fg) =>
      onSurfaces(`color-${fg}`, TEXT),
    ),
    // Placeholders: inputs sit on white (or neutral-50) only.
    ...onSurfaces("color-neutral-500", TEXT).filter(([, bg]) => bg !== "color-neutral-100"),
    ...onSurfaces("color-neutral-500", NON_TEXT),
    ...onSurfaces("color-primary-500", NON_TEXT),
    ...["primary", "secondary"].flatMap((family): [string, string, number][] => [
      [ON_FILL[mode], `color-${family}-600`, TEXT],
      [ON_FILL[mode], `color-${family}-700`, TEXT],
      [`color-${family}-800`, `color-${family}-100`, TEXT],
      ["color-neutral-900", `color-${family}-50`, TEXT],
    ]),
    ...STATUSES.flatMap((status): [string, string, number][] => [
      [`color-${status}-dark`, `color-${status}-light`, TEXT],
      ["color-neutral-900", `color-${status}-light`, TEXT],
      [status === "warning" ? "color-neutral-900" : ON_FILL[mode], `color-${status}-default`, TEXT],
      ...onSurfaces(`color-${status}-dark`, TEXT),
      ...(status === "warning" && mode === "light" ? [] : onSurfaces(`color-${status}-default`, NON_TEXT)),
    ]),
  ].map(([fg, bg, min]): [string, string, number] =>
    // Text on amber is dark ink in both modes: neutral-900 in light, neutral-50 in dark.
    fg === "color-neutral-900" && bg === "color-warning-default" && mode === "dark"
      ? ["color-neutral-50", bg, min]
      : [fg, bg, min],
  );
}

describe("palette", () => {
  describe.each(["light", "dark"] as const)("%s mode", (mode) => {
    const tokens = baseTokens(mode);
    it.each(palettePairings(mode))("%s on %s meets %s:1", (fg, bg, min) => {
      expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(min);
    });
  });
});

describe("theme tokens", () => {
  it("parses a full token set for every theme", () => {
    for (const theme of THEMES) {
      expect(Object.keys(themeTokens(theme)).length).toBeGreaterThanOrEqual(19);
    }
  });

  it("covers every color token with at least one pairing", () => {
    const paired = new Set(PAIRINGS.flatMap(([fg, bg]) => [fg, bg]));
    const unpaired = Object.keys(baseTokens("light")).filter(
      (name) => !name.startsWith("color-") && !paired.has(name),
    );
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
