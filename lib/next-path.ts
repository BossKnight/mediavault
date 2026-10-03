/**
 * Where to go after signing in: the `next` path from the URL when it's a
 * path on this site, otherwise the vault. Anything else (another origin,
 * a protocol-relative "//host" or "/\host") could send the user off-site
 * right after they enter their password.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/vault";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/vault";
  return value;
}
