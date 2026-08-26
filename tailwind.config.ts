import type { Config } from "tailwindcss";

/** Wires a CSS custom property (HSL triple) into a Tailwind color, opacity-aware. */
function themeColor(variable: string) {
  return `hsl(var(${variable}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: ["class"],
  // .dark / .light are only ever applied at runtime via
  // document.documentElement.classList (see app/globals.css) — they never
  // appear as a literal `className` string in any scanned file, so
  // Tailwind's content scanner can't see them as "used" and will purge the
  // CSS rules that key off them unless they're safelisted here.
  safelist: ["dark", "light"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: themeColor("--background"),
        foreground: themeColor("--foreground"),
        surface: {
          DEFAULT: themeColor("--surface"),
          foreground: themeColor("--surface-foreground"),
          raised: themeColor("--surface-raised"),
        },
        border: themeColor("--border"),
        muted: {
          DEFAULT: themeColor("--muted"),
          foreground: themeColor("--muted-foreground"),
        },
        accent: {
          DEFAULT: themeColor("--accent"),
          foreground: themeColor("--accent-foreground"),
          hover: themeColor("--accent-hover"),
          muted: themeColor("--accent-muted"),
          "muted-foreground": themeColor("--accent-muted-foreground"),
        },
        success: {
          DEFAULT: themeColor("--success"),
          foreground: themeColor("--success-foreground"),
        },
        warning: {
          DEFAULT: themeColor("--warning"),
          foreground: themeColor("--warning-foreground"),
        },
        danger: {
          DEFAULT: themeColor("--danger"),
          foreground: themeColor("--danger-foreground"),
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "var(--radius-card)",
      },
    },
  },
  plugins: [],
};

export default config;
