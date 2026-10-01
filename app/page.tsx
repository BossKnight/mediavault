// proxy.ts redirects every request for "/" before this ever renders. This
// file exists only because the App Router requires a page at a route for
// it to be valid. Keep it a trivial fallback, not a duplicate of the
// redirect logic that already lives in proxy.ts.
export default function HomePage() {
  return null;
}
