"use client";

import { StatusBadge } from "@/features/catalog/status-badge";
import type { CatalogEntry } from "@/types/media";

interface CatalogListProps {
  entries: CatalogEntry[];
  onSelect: (entry: CatalogEntry) => void;
}

function releaseYear(entry: CatalogEntry): string {
  return entry.mediaItem.releaseDate?.slice(0, 4) ?? "Unknown";
}

/**
 * The vault as a text list: title, platforms or formats, release year and
 * status. The title is the button that opens an item, so the table stays a
 * real table for screen readers while the whole row is clickable.
 */
export function CatalogList({ entries, onSelect }: CatalogListProps) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Your vault</caption>
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">
              Title
            </th>
            <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
              Platform
            </th>
            <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
              Release year
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const platforms = entry.platforms.join(", ");
            return (
              <tr
                key={entry.id}
                onClick={() => onSelect(entry)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-raised"
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
                  {/* Phones have no room for these columns, so they sit under the title. */}
                  <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                    {[platforms, entry.mediaItem.releaseDate?.slice(0, 4) ?? "Unknown year"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {platforms || <span className="sr-only">None</span>}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">
                  {releaseYear(entry)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={entry.status} mediaType={entry.mediaItem.mediaType} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
