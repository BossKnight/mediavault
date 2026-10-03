"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@/components/ui/icons";
import { THEMES, THEME_COOKIE, type Theme, themeClass } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Notifies mounted toggles after a theme change in this tab.
const themeListeners = new Set<() => void>();

function subscribeToTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  themeListeners.add(onChange);
  media.addEventListener("change", onChange);
  return () => {
    themeListeners.delete(onChange);
    media.removeEventListener("change", onChange);
  };
}

// The class app/layout.tsx rendered from the cookie, or the OS preference.
function getThemeSnapshot(): Theme {
  const root = document.documentElement;
  const chosen = THEMES.find((theme) => root.classList.contains(themeClass(theme)));
  if (chosen) return chosen;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

// The server can't see the OS preference, so it renders a placeholder and
// the client fills in the real theme after hydration.
function getServerThemeSnapshot(): Theme | null {
  return null;
}

/**
 * A manual light/dark override for the theme app/globals.css otherwise
 * picks from `prefers-color-scheme`. It swaps the `.theme-*` class on
 * <html> and saves the choice in a cookie, which app/layout.tsx reads to
 * render the same class on the next load, with no script before paint.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  function toggle() {
    const next: Theme = getThemeSnapshot() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.remove(...THEMES.map(themeClass));
    root.classList.add(themeClass(next));
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    themeListeners.forEach((listener) => listener());
  }

  if (theme === null) {
    return <div className="h-9 w-9 shrink-0" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
