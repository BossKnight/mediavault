"use client";

import { useMemo, useState } from "react";
import { AddItemModal } from "@/features/catalog/add-item-modal";
import { FilterBar } from "@/features/catalog/filter-bar";
import { CatalogItemCard } from "@/features/catalog/catalog-item-card";
import { ItemDetailModal } from "@/features/catalog/item-detail-modal";
import { StatsPanel } from "@/features/catalog/stats-panel";
import { computeStats } from "@/lib/catalog";
import type { CatalogEntry, MediaType, WatchStatus } from "@/types/media";

interface CatalogViewProps {
  initialEntries: CatalogEntry[];
}

export function CatalogView({ initialEntries }: CatalogViewProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"ALL" | MediaType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | WatchStatus>("ALL");
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);

  const stats = useMemo(() => computeStats(entries), [entries]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (mediaTypeFilter !== "ALL" && entry.mediaItem.mediaType !== mediaTypeFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && entry.status !== statusFilter) {
        return false;
      }
      if (query && !entry.mediaItem.title.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [entries, mediaTypeFilter, statusFilter, search]);

  function handleAdded(entry: CatalogEntry) {
    setEntries((current) => [entry, ...current]);
  }

  function handleUpdated(entry: CatalogEntry) {
    setEntries((current) => current.map((existing) => (existing.id === entry.id ? entry : existing)));
  }

  function handleDeleted(id: string) {
    setEntries((current) => current.filter((existing) => existing.id !== id));
  }

  return (
    <div className="flex flex-col gap-8">
      <StatsPanel stats={stats} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          mediaType={mediaTypeFilter}
          onMediaTypeChange={setMediaTypeFilter}
          status={statusFilter}
          onStatusChange={setStatusFilter}
        />
        <AddItemModal onAdded={handleAdded} />
      </div>

      {filteredEntries.length === 0 ? (
        <EmptyState hasAnyEntries={entries.length > 0} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredEntries.map((entry) => (
            <CatalogItemCard key={entry.id} entry={entry} onSelect={setSelectedEntry} />
          ))}
        </div>
      )}

      <ItemDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdated={(entry) => {
          handleUpdated(entry);
          setSelectedEntry(entry);
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

function EmptyState({ hasAnyEntries }: { hasAnyEntries: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-card border border-dashed border-border py-16 text-center">
      <p className="text-sm font-medium text-white">
        {hasAnyEntries ? "No items match your filters" : "Your catalog is empty"}
      </p>
      <p className="text-sm text-muted">
        {hasAnyEntries
          ? "Try clearing a filter or searching for something else."
          : "Use “Add Item” to search for a movie, show, or game to catalog."}
      </p>
    </div>
  );
}
