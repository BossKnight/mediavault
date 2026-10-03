"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LIST_NAMES,
  entryMatchesFilters,
  listNoticeMessage,
  type ListFilters,
  type ListNotice,
} from "@/lib/added-notice";
import type { OwnershipStatus } from "@/types/media";

interface ListNoticeBarProps {
  notice: ListNotice;
  // The list this page shows.
  list: OwnershipStatus;
  filters: ListFilters;
  onDismiss: () => void;
  onClearFilters: () => void;
}

/**
 * Confirms adds and moves above a list. Links to the other list when the
 * item went there, and says so when the page's filters hide an item that
 * was just added here.
 */
export function ListNoticeBar({
  notice,
  list,
  filters,
  onDismiss,
  onClearFilters,
}: ListNoticeBarProps) {
  const other: OwnershipStatus = list === "OWNED" ? "WISHLIST" : "OWNED";
  const elsewhere = notice.kind === "added" ? notice.ownership !== list : notice.elsewhere;
  const added = notice.kind === "added" && notice.ownership === list ? notice.entries : [];
  const hidden = added.filter((entry) => !entryMatchesFilters(entry, filters)).length;
  const hiddenNote =
    hidden === 0
      ? null
      : added.length === 1
        ? "Your filters hide it."
        : hidden === added.length
          ? "Your filters hide them."
          : "Your filters hide some of them.";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent/40 bg-accent-muted px-4 py-3 text-sm text-accent-muted-foreground">
      <span>
        {listNoticeMessage(notice)}
        {elsewhere && (
          <>
            {" "}
            <Link
              href={other === "WISHLIST" ? "/wishlist" : "/vault"}
              className="focus-ring rounded font-medium underline underline-offset-2"
            >
              View {LIST_NAMES[other]}
            </Link>
          </>
        )}
        {hiddenNote && <> {hiddenNote}</>}
      </span>
      <span className="flex gap-1">
        {hiddenNote && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </span>
    </div>
  );
}
