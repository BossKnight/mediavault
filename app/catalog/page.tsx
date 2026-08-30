import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { fetchCatalogPage, fetchCatalogStats, type CatalogQueryParams } from "@/lib/catalog-db";
import { readMediaTypeParam, readSortParam, readStatusParam } from "@/lib/catalog-search-params";
import { CatalogView } from "@/features/catalog/catalog-view";
import { AppHeader } from "@/features/navigation/app-header";

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const sp = await searchParams;
  const params: CatalogQueryParams = {
    ownership: "OWNED",
    status: readStatusParam(firstValue(sp.status)),
    mediaType: readMediaTypeParam(firstValue(sp.type)),
    q: firstValue(sp.q)?.trim() || undefined,
    sort: readSortParam(firstValue(sp.sort)),
  };

  // Fetched together, not chained — neither depends on the other's result.
  const [page, stats] = await Promise.all([
    fetchCatalogPage(userId, params),
    fetchCatalogStats(userId, "OWNED"),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AppHeader />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Your catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Movies, TV shows, games, and books you own or plan to get to.
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <CatalogView
          initialEntries={page.entries}
          initialNextCursor={page.nextCursor}
          initialStats={stats}
        />
      </Suspense>
    </main>
  );
}
