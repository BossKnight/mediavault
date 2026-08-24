import { Badge } from "@/components/ui/badge";
import { getStatusLabel, type MediaType, type WatchStatus } from "@/types/media";

const STATUS_TONE: Record<WatchStatus, "neutral" | "accent" | "success" | "warning"> = {
  PLAN_TO_WATCH: "neutral",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  ON_HOLD: "warning",
  DROPPED: "neutral",
};

export function StatusBadge({ status, mediaType }: { status: WatchStatus; mediaType: MediaType }) {
  return <Badge tone={STATUS_TONE[status]}>{getStatusLabel(status, mediaType)}</Badge>;
}
