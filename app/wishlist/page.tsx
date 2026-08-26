import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { fetchCatalogPage, fetchCatalogStats, type CatalogQueryParams } from "@/lib/catalog-query";
import { readMediaTypeParam, readSortParam } from "@/lib/catalog-params";
import { WishlistView } from "@/features/wishlist/wishlist-view";
import { AppHeader } from "@/features/navigation/app-header";

interface WishlistPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WishlistPage({ searchParams }: WishlistPageProps) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const sp = await searchParams;
  const params: CatalogQueryParams = {
    ownership: "WISHLIST",
    mediaType: readMediaTypeParam(firstValue(sp.type)),
    q: firstValue(sp.q)?.trim() || undefined,
    sort: readSortParam(firstValue(sp.sort)),
  };

  // Wishlist has no visible stats panel, but still needs the true total
  // (independent of pagination) to tell "empty collection" apart from
  // "no results under the current filter" — see WishlistView.
  const [page, stats] = await Promise.all([
    fetchCatalogPage(userId, params),
    fetchCatalogStats(userId, "WISHLIST"),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AppHeader />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Your wishlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Movies, TV shows, games, and books you want to own next.
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <WishlistView
          initialEntries={page.entries}
          initialNextCursor={page.nextCursor}
          initialTotal={stats.total}
        />
      </Suspense>
    </main>
  );
}
