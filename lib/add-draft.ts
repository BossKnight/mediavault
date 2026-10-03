import { useMemo, useSyncExternalStore } from "react";
import type { MediaType, UnifiedSearchResult } from "@/types/media";

/**
 * A pick in the Add Item dialog that wasn't saved: the dialog (or the tab's
 * page) was closed on the confirm step, or the session expired there. It's
 * kept in sessionStorage, so it survives closing the dialog, reloading, and
 * the round trip through sign-in, but not closing the tab, and offered back
 * once as "Finish adding".
 */
export interface AddDraft {
  result: UnifiedSearchResult;
  platforms: string[];
}

const KEY = "mediavault:add-draft";

const MEDIA_TYPES: readonly MediaType[] = ["MOVIE", "TV", "GAME", "BOOK"];

function isDraft(value: unknown): value is AddDraft {
  if (typeof value !== "object" || value === null) return false;
  const { result, platforms } = value as Partial<AddDraft>;
  return (
    typeof result === "object" &&
    result !== null &&
    typeof result.title === "string" &&
    typeof result.externalId === "string" &&
    MEDIA_TYPES.includes(result.mediaType) &&
    Array.isArray(platforms) &&
    platforms.every((platform) => typeof platform === "string")
  );
}

// Storage can be unavailable (privacy modes, blocked site data) or hold
// something stale or hand-edited; either way there's just no draft.

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(update: (storage: Storage) => void) {
  try {
    update(window.sessionStorage);
  } catch {
    // Not stored: closing the dialog loses the pick, as it always did.
  }
  listeners.forEach((listener) => listener());
}

function readRaw(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseAddDraft(raw: string | null): AddDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isDraft(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveAddDraft(draft: AddDraft) {
  write((storage) => storage.setItem(KEY, JSON.stringify(draft)));
}

export function clearAddDraft() {
  write((storage) => storage.removeItem(KEY));
}

/** The saved draft, kept current as the dialog saves or clears it. Null on the server. */
export function useAddDraft(): AddDraft | null {
  // The raw string is the snapshot, since it compares equal between reads
  // and a freshly parsed object never would.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parseAddDraft(raw), [raw]);
}
