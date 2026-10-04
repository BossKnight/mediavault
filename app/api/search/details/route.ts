import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { lookupMediaDetails } from "@/lib/external-apis";
import type { MediaType, MetadataSource } from "@/types/media";

const SOURCES: MetadataSource[] = ["TMDB", "RAWG", "OPENLIBRARY"];
const TYPE_PARAM_MAP: Record<string, MediaType> = { movie: "MOVIE", tv: "TV", game: "GAME", book: "BOOK" };

/**
 * One title's full details from its provider, for what search results
 * leave out: the Add Item dialog asks for a show's season count here when
 * the user picks it. `{ result: null }` when the provider has no such title.
 */
export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source")?.toUpperCase() as MetadataSource;
  const mediaType = TYPE_PARAM_MAP[searchParams.get("type")?.toLowerCase() ?? ""];
  const externalId = searchParams.get("id")?.trim();

  if (!SOURCES.includes(source) || !mediaType || !externalId) {
    return NextResponse.json(
      { error: "Query parameters 'source', 'type' and 'id' are required" },
      { status: 400 },
    );
  }

  try {
    const result = await lookupMediaDetails({ source, mediaType, externalId });
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Details lookup failed", error);
    return NextResponse.json({ error: "Details are temporarily unavailable" }, { status: 502 });
  }
}
