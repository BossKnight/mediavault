import { WATCH_STATUS_LABELS, type CatalogStats, type WatchStatus } from "@/types/media";
import { cn } from "@/lib/utils";

interface StatsPanelProps {
  stats: CatalogStats;
  statusFilter: "ALL" | WatchStatus;
  onStatusFilterChange: (value: "ALL" | WatchStatus) => void;
}

/**
 * A compact row of stat tiles. Deliberately not a chart, five numbers don't
 * need one. Below the sm breakpoint the tiles collapse into a single
 * horizontally scrolling row, so the catalog grid starts higher on the
 * screen; at sm and up they lay out as a regular grid.
 *
 * The four tiles with a matching status filter (Total items, In Progress,
 * Completed, Plan to Watch) double as shortcuts into that filter. Avg.
 * rating and the media-type breakdown have nothing to filter into, so they
 * stay plain, non-interactive tiles.
 */
export function StatsPanel({ stats, statusFilter, onStatusFilterChange }: StatsPanelProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
      <StatFilterTile
        label="Total items"
        value={stats.total}
        active={statusFilter === "ALL"}
        onClick={() => onStatusFilterChange("ALL")}
      />
      <StatFilterTile
        label={WATCH_STATUS_LABELS.IN_PROGRESS}
        value={stats.byStatus.IN_PROGRESS}
        active={statusFilter === "IN_PROGRESS"}
        onClick={() => onStatusFilterChange("IN_PROGRESS")}
      />
      <StatFilterTile
        label={WATCH_STATUS_LABELS.COMPLETED}
        value={stats.byStatus.COMPLETED}
        active={statusFilter === "COMPLETED"}
        onClick={() => onStatusFilterChange("COMPLETED")}
      />
      <StatFilterTile
        label={WATCH_STATUS_LABELS.PLAN_TO_WATCH}
        value={stats.byStatus.PLAN_TO_WATCH}
        active={statusFilter === "PLAN_TO_WATCH"}
        onClick={() => onStatusFilterChange("PLAN_TO_WATCH")}
      />
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

const TILE_SHAPE = "min-w-[7.5rem] shrink-0 rounded-card p-3 sm:min-w-0 sm:shrink sm:p-4";

interface StatTileProps {
  label: string;
  value: string | number;
  small?: boolean;
}

/** A plain, non-interactive stat with nothing behind it to click into. */
function StatTile({ label, value, small }: StatTileProps) {
  return (
    <div className={cn(TILE_SHAPE, "border border-transparent")}>
      <p
        className={
          small ? "text-lg font-semibold text-surface-foreground" : "text-2xl font-semibold text-surface-foreground"
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

interface StatFilterTileProps {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}

/** A stat that also acts as a shortcut into the matching status filter. */
function StatFilterTile({ label, value, active, onClick }: StatFilterTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        TILE_SHAPE,
        "focus-ring border text-left transition-colors",
        active
          ? "border-accent bg-accent-muted"
          : "border-border bg-surface hover:border-muted-foreground",
      )}
    >
      <p className={cn("text-2xl font-semibold", active ? "text-accent" : "text-surface-foreground")}>
        {value}
      </p>
      <p className={cn("mt-1 text-xs", active ? "text-accent-muted-foreground" : "text-muted-foreground")}>
        {label}
      </p>
    </button>
  );
}
