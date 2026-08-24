import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { searchMedia } from "@/lib/external-apis";
import type { MediaType } from "@/types/media";

const VALID_TYPES: MediaType[] = ["MOVIE", "TV", "GAME"];

// Accepts the lowercase `movie|tv|game` values from the spec's query string
// and maps them to the uppercase MediaType used internally.
const TYPE_PARAM_MAP: Record<string, MediaType> = {
  movie: "MOVIE",
  tv: "TV",
  game: "GAME",
};

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const typeParam = searchParams.get("type")?.toLowerCase() ?? "";
  const mediaType = TYPE_PARAM_MAP[typeParam];

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }
  if (!mediaType || !VALID_TYPES.includes(mediaType)) {
    return NextResponse.json(
      { error: "Query parameter 'type' must be one of movie, tv, game" },
      { status: 400 },
    );
  }

  try {
    const results = await searchMedia(query, mediaType);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search failed", error);
    return NextResponse.json(
      { error: "Search provider is temporarily unavailable" },
      { status: 502 },
    );
  }
}
