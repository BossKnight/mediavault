import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { isIsbn } from "@/lib/isbn";
import { lookupIsbn } from "@/lib/external-apis/openlibrary";
import { lookupUpc } from "@/lib/external-apis/upcitemdb";
import { searchMedia } from "@/lib/external-apis";
import type { MediaType } from "@/types/media";

// Accepts the same lowercase `movie|tv|game|book` values as /api/search.
const TYPE_PARAM_MAP: Record<string, MediaType> = {
  movie: "MOVIE",
  tv: "TV",
  game: "GAME",
  book: "BOOK",
};

/**
 * Resolves a scanned or manually-entered barcode to catalog search results,
 * in the same `{ results: UnifiedSearchResult[] }` shape /api/search
 * returns — the client feeds the result straight into the existing
 * confirm/save flow, no separate save path needed.
 *
 * An ISBN-13/10 code (`code`) is a book barcode and resolves directly,
 * no `type` needed — the ISBN itself says it's a book. Any other code is
 * a general UPC/EAN, which doesn't encode a media type on its own, so
 * `type` (movie/tv/game) is required to know what to search for once the
 * barcode resolves to a product name.
 */
export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim();
  const typeParam = searchParams.get("type")?.toLowerCase() ?? "";

  if (!code) {
    return NextResponse.json({ error: "Query parameter 'code' is required" }, { status: 400 });
  }

  try {
    if (isIsbn(code)) {
      const result = await lookupIsbn(code);
      return NextResponse.json({ results: result ? [result] : [] });
    }

    const mediaType = TYPE_PARAM_MAP[typeParam];
    if (!mediaType) {
      return NextResponse.json(
        { error: "That doesn't look like a book barcode. Pick a type (movie, TV, or game) and try again." },
        { status: 400 },
      );
    }

    const productName = await lookupUpc(code);
    if (!productName) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchMedia(productName, mediaType);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Barcode lookup failed", error);
    return NextResponse.json(
      { error: "Barcode lookup is temporarily unavailable" },
      { status: 502 },
    );
  }
}
