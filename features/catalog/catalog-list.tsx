"use client";

import { StatusBadge } from "@/features/catalog/status-badge";
import { cn } from "@/lib/utils";
import { MEDIA_TYPE_LABELS, type CatalogEntry } from "@/types/media";

interface CatalogListProps {
  entries: CatalogEntry[];
  onSelect: (entry: CatalogEntry) => void;
  // The wishlist shows each title's type instead of platform and status:
  // nothing there has been started, and wishlist cards hide platforms too.
  variant?: "vault" | "wishlist";
  // Just-added entries, tinted while the page's "Added ..." notice shows.
  highlightedIds?: ReadonlySet<string>;
}

function releaseYear(entry: CatalogEntry): string | null {
  return entry.mediaItem.releaseDate?.slice(0, 4) ?? null;
}

/**
 * The vault or wishlist as a text list. The title is the button that opens
 * an item, so the table stays a real table for screen readers while the
 * whole row is clickable.
 */
export function CatalogList({
  entries,
  onSelect,
  variant = "vault",
  highlightedIds,
}: CatalogListProps) {
  const isVault = variant === "vault";

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{isVault ? "Your vault" : "Your wishlist"}</caption>
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">
              Title
            </th>
            <th scope="col" className={isVault ? "hidden px-4 py-2.5 font-medium sm:table-cell" : "px-4 py-2.5 font-medium"}>
              {isVault ? "Platform" : "Type"}
            </th>
            <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
              Release year
            </th>
            {isVault && (
              <th scope="col" className="px-4 py-2.5 font-medium">
                Status
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const platforms = entry.platforms.join(", ");
            const year = releaseYear(entry);
            // Phones have no room for every column, so these sit under the title.
            const subline = isVault ? [platforms, year ?? "Unknown year"] : [year ?? "Unknown year"];
            return (
              <tr
                key={entry.id}
                onClick={() => onSelect(entry)}
                className={cn(
                  "cursor-pointer border-b border-border last:border-0 hover:bg-surface-raised",
                  highlightedIds?.has(entry.id) && "bg-accent-muted",
                )}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      // The row's own click handler opens it too.
                      event.stopPropagation();
                      onSelect(entry);
                    }}
                    className="focus-ring rounded text-left font-medium text-surface-foreground"
                  >
                    {entry.mediaItem.title}
                  </button>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                    {subline.filter(Boolean).join(" · ")}
                  </p>
                </td>
                {isVault ? (
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {platforms || <span className="sr-only">None</span>}
                  </td>
                ) : (
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {MEDIA_TYPE_LABELS[entry.mediaItem.mediaType]}
                  </td>
                )}
                <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">
                  {year ?? "Unknown"}
                </td>
                {isVault && (
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={entry.status} mediaType={entry.mediaItem.mediaType} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
