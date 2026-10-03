import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE, readTheme, themeClass } from "@/lib/theme";
import { cn } from "@/lib/utils";
import "./globals.css";

// Self-hosted by Next at build time — no external font request at runtime,
// so this adds no render-blocking network call. Exposed as a CSS variable
// (rather than the default class-based swap) so tailwind.config.ts can
// compose it into the existing `font-sans` utility.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MediaVault",
  description: "Keep your movies, TV shows, games, and books in one vault.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A saved theme is rendered into the markup, so the first paint is already
  // correct with no script. Without one, app/globals.css follows the OS.
  const theme = readTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang="en" className={cn(inter.variable, theme && themeClass(theme))}>
      <body>{children}</body>
    </html>
  );
}
