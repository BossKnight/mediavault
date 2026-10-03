import { useState } from "react";
import { LAYOUT_COOKIE } from "@/lib/catalog-params";
import type { CatalogLayout } from "@/types/media";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The page's thumbnails/list layout, saving every change as the new default. */
export function useLayoutPreference(initialLayout: CatalogLayout) {
  const [layout, setLayoutState] = useState(initialLayout);

  function setLayout(next: CatalogLayout) {
    setLayoutState(next);
    document.cookie = `${LAYOUT_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  }

  return [layout, setLayout] as const;
}
