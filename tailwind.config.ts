import type { Config } from "tailwindcss";

/** Wires a CSS custom property (HSL triple) into a Tailwind color, opacity-aware. */
function themeColor(variable: string) {
  return `hsl(var(${variable}) / <alpha-value>)`;
}

const config: Config = {
  // `hover:` only applies on devices that can hover, so a tap on a phone
  // doesn't leave a button stuck in its hover color.
  future: {
    hoverOnlyWhenSupported: true,
  },
  // Colors switch themes through the CSS custom properties in
  // app/globals.css, so components never need `dark:` variants.
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
          muted: themeColor("--success-muted"),
          "muted-foreground": themeColor("--success-muted-foreground"),
        },
        warning: {
          DEFAULT: themeColor("--warning"),
          foreground: themeColor("--warning-foreground"),
          muted: themeColor("--warning-muted"),
          "muted-foreground": themeColor("--warning-muted-foreground"),
        },
        danger: {
          DEFAULT: themeColor("--danger"),
          foreground: themeColor("--danger-foreground"),
          muted: themeColor("--danger-muted"),
          "muted-foreground": themeColor("--danger-muted-foreground"),
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      animation: {
        // An error message settling into place (keyframes in globals.css).
        rise: "rise 160ms cubic-bezier(0.2, 0, 0, 1)",
      },
      borderRadius: {
        card: "var(--radius-card)",
      },
      // Tailwind's built-in `aria-*` variants cover checked/disabled/
      // expanded/hidden/pressed/readonly/required/selected, but not
      // `invalid` — this registers it so `aria-invalid:...` utilities
      // (e.g. Input's `aria-invalid:border-danger`) actually generate a
      // rule instead of silently being dropped as unrecognized.
      aria: {
        invalid: 'invalid="true"',
      },
    },
  },
  plugins: [],
};

export default config;
