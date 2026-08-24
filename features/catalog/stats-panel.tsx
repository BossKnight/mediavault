import { WATCH_STATUS_LABELS, type CatalogStats } from "@/types/media";

interface StatsPanelProps {
  stats: CatalogStats;
}

/** A compact row of stat tiles. Deliberately not a chart — five numbers don't need one. */
export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
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
    <div className="rounded-card border border-border bg-surface p-4">
      <p
        className={
          small
            ? "text-lg font-semibold text-white"
            : `text-2xl font-semibold ${emphasize ? "text-accent-hover" : "text-white"}`
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
