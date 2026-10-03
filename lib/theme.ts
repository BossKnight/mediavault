/**
 * Themes a user can choose explicitly. Each name needs a matching
 * `:root.theme-<name>` block in app/globals.css ("light" excepted: the
 * :root defaults are light). With no choice saved, the OS preference wins.
 */
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "mediavault-theme";

export function readTheme(value: string | null | undefined): Theme | null {
  return THEMES.find((theme) => theme === value) ?? null;
}

export function themeClass(theme: Theme) {
  return `theme-${theme}`;
}
