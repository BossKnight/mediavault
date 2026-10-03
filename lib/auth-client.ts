// next-auth's browser client (about 12 KB gzipped) is only needed at the
// moment someone signs in or out, so it's fetched on first intent (focus or
// pointer over the form or button) instead of with every page.
export const loadAuthClient = () => import("next-auth/react");

export function preloadAuthClient() {
  void loadAuthClient();
}
