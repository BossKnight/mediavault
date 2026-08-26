import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted by Next at build time — no external font request at runtime,
// so this adds no render-blocking network call. Exposed as a CSS variable
// (rather than the default class-based swap) so tailwind.config.ts can
// compose it into the existing `font-sans` utility.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MediaVault",
  description: "Catalog your movies, TV shows, games, and books in one place.",
};

// Applies a persisted light/dark choice (see ThemeToggle) before first
// paint, the same way the OS-preference path already works with zero
// script per app/globals.css's own theming notes. Runs before hydration,
// so `suppressHydrationWarning` on <html> below is the standard, expected
// companion to this pattern — only the class list it touches can differ
// between server and client markup, nothing React itself renders.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("mediavault-theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
