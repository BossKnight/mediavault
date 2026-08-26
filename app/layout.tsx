import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediaVault",
  description: "Catalog your movies, TV shows, games, and books in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
