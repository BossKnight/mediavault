import type { SVGProps } from "react";

type LogoProps = SVGProps<SVGSVGElement>;

/**
 * The MediaVault mark: a five-ring target on a dark rounded-square badge.
 * Used as the browser favicon (app/icon.svg carries the same artwork), the
 * auth-page mark, and the catalog header.
 */
export function Logo(props: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="100" height="100" rx="22" fill="#18181a" />
      <circle cx="50" cy="50" r="42" fill="#1483a1" />
      <circle cx="50" cy="50" r="34" fill="#c81f3a" />
      <circle cx="50" cy="50" r="24" fill="#1483a1" />
      <circle cx="50" cy="50" r="14" fill="#eef1f2" />
      <circle cx="50" cy="50" r="6" fill="#141414" />
    </svg>
  );
}
