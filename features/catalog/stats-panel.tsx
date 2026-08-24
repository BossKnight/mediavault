import { WATCH_STATUS_LABELS, type CatalogStats } from "@/types/media";

interface StatsPanelProps {
  stats: CatalogStats;
}

/**
 * A compact row of stat tiles. Deliberately not a chart, five numbers don't
 * need one. Below the sm breakpoint the tiles collapse into a single
 * horizontally scrolling row, so the catalog grid starts higher on the
 * screen; at sm and up they lay out as a regular grid.
 */
export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
      <StatTile label="Total items" value={stats.total} emphasize />
      <StatTile label={WATCH_STATUS_LABELS.IN_PROGRESS} value={stats.byStatus.IN_PROGRESS} />
      <StatTile label={WATCH_STATUS_LABELS.COMPLETED} value={stats.byStatus.COMPLETED} />
      <StatTile label={WATCH_STATUS_LABELS.PLAN_TO_WATCH} value={stats.byStatus.PLAN_TO_WATCH} />
      <StatTile
        label="Avg. rating"
        value={stats.averageRating != null ? stats.averageRating.toFixed(1) : "—"}
      />
      <StatTile
        label="Movies / TV / Games"
        value={`${stats.byMediaType.MOVIE} / ${stats.byMediaType.TV} / ${stats.byMediaType.GAME}`}
        small
      />
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  emphasize?: boolean;
  small?: boolean;
}

function StatTile({ label, value, emphasize, small }: StatTileProps) {
  return (
    <div className="min-w-[7.5rem] shrink-0 rounded-card border border-border bg-surface p-3 sm:min-w-0 sm:shrink sm:p-4">
      <p
        className={
          small
            ? "text-lg font-semibold text-surface-foreground"
            : `text-2xl font-semibold ${emphasize ? "text-accent" : "text-surface-foreground"}`
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
