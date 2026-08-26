"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@/components/ui/icons";

const STORAGE_KEY = "mediavault-theme";
type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
  // Null until mounted: the real starting value depends on localStorage,
  // which isn't available during server rendering, so nothing renders
  // until the client can read it — avoids a first-paint icon guess that
  // might not match what app/layout.tsx's inline script already applied.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setTheme(stored === "light" || stored === "dark" ? stored : getSystemTheme());
  }, []);

  function toggle() {
    const next: Theme = (theme ?? getSystemTheme()) === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    localStorage.setItem(STORAGE_KEY, next);
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
