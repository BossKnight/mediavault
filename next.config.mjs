/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "media.rawg.io" },
    ],
    // Cover art (TMDB/RAWG) is the dominant asset on every page. AVIF isn't
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
