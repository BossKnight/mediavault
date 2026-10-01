/** @type {import('next').NextConfig} */
const nextConfig = {
  // The owned-items page moved from /catalog to /vault. Keep old bookmarks
  // and links working.
  async redirects() {
    return [{ source: "/catalog", destination: "/vault", permanent: true }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "media.rawg.io" },
      // Book covers: Open Library first, Google Books as the fallback.
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
    ],
    // Cover art is the dominant asset on every page. AVIF isn't
    // served by default; it's typically 20-30% smaller than WebP at
    // comparable quality for photographic images like posters and box art.
    // Listed first so it's preferred whenever the browser supports it, with
    // WebP as the fallback.
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Radix isn't in Next's built-in optimized-imports list. This lets the
    // compiler rewrite our `import * as X from "@radix-ui/react-dialog"` /
    // "-select" into per-module imports, so a route that only uses Dialog
    // doesn't pull Select's module graph along with it (and vice versa).
    optimizePackageImports: ["@radix-ui/react-dialog", "@radix-ui/react-select"],
  },
};

export default nextConfig;
