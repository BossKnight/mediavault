import { Badge } from "@/components/ui/badge";
import { WATCH_STATUS_LABELS, type WatchStatus } from "@/types/media";

const STATUS_TONE: Record<WatchStatus, "neutral" | "accent" | "success" | "warning"> = {
  PLAN_TO_WATCH: "neutral",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  ON_HOLD: "warning",
  DROPPED: "neutral",
};

export function StatusBadge({ status }: { status: WatchStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{WATCH_STATUS_LABELS[status]}</Badge>;
}
