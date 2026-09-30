"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@/components/ui/icons";

const STORAGE_KEY = "mediavault-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
type Theme = "light" | "dark";

// Notifies mounted toggles after a same-tab write, since the `storage` event
// only fires in other tabs.
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

function getThemeSnapshot(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

// localStorage isn't readable during server rendering, so the server renders
// a placeholder and the client fills in the real theme after hydration. This
// avoids a first-paint icon guess that might not match what app/layout.tsx's
// inline script already applied.
function getServerThemeSnapshot(): Theme | null {
  return null;
}

/**
 * A manual override for the light/dark theme app/globals.css otherwise
 * picks purely from `prefers-color-scheme`. The class this toggles
 * (`.light` / `.dark` on `<html>`) is the same mechanism the CSS already
 * documents as its intended extension point — this just adds the button
 * and the persistence, nothing new at the CSS level. The matching
 * before-paint script lives in app/layout.tsx, so a stored choice never
 * flashes the other theme on load.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  function toggle() {
    const next: Theme = getThemeSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    localStorage.setItem(STORAGE_KEY, next);
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
