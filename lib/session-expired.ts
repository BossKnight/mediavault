/** Shown wherever an API call finds the session gone (HTTP 401). */
export const SESSION_EXPIRED_MESSAGE = "Your session expired. Sign in again to continue.";

/**
 * The message to show for a failed API response: the session-expired
 * message for a 401 (the server's own text there is just "Unauthorized"),
 * otherwise the server's error, otherwise `fallback`.
 */
export function apiErrorMessage(response: Response, data: unknown, fallback: string): string {
  if (response.status === 401) return SESSION_EXPIRED_MESSAGE;
  const error = (data as { error?: unknown } | null)?.error;
  return typeof error === "string" && error ? error : fallback;
}

/** The sign-in page, set to return to the page the user is on now. */
export function signInAgainHref(): string {
  return `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}
