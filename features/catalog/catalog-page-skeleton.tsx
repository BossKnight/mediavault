import { AppHeader } from "@/features/navigation/app-header";

interface CatalogPageSkeletonProps {
  title: string;
}

/**
 * Route-level loading UI for the catalog and wishlist pages (their
 * loading.tsx files). Mirrors the real page's header and grid so content
 * doesn't jump when the server render arrives.
 */
export function CatalogPageSkeleton({ title }: CatalogPageSkeletonProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AppHeader />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <div className="mt-2 h-4 w-64 max-w-full rounded bg-surface-raised motion-safe:animate-pulse" />
      </div>

      <p role="status" className="sr-only">
        Loading {title.toLowerCase()}...
      </p>
      <div
        aria-hidden
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      >
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-card border border-border bg-surface">
            <div className="aspect-[2/3] w-full bg-surface-raised motion-safe:animate-pulse" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-3.5 w-3/4 rounded bg-surface-raised motion-safe:animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-surface-raised motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
