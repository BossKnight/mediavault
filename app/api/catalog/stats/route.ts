import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { fetchCatalogStats } from "@/lib/catalog-query";

/**
 * Aggregate counts for the current user's owned catalog or wishlist,
 * independent of pagination — see fetchCatalogStats for why this is a
 * separate query rather than something derived from a page of results.
 */
export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ownership = searchParams.get("ownership") === "WISHLIST" ? "WISHLIST" : "OWNED";

  const stats = await fetchCatalogStats(userId, ownership);
  return NextResponse.json({ stats });
}
