"use client";

import { type ComponentProps, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { X } from "@/components/ui/icons";
import { type AddDraft, clearAddDraft, useAddDraft } from "@/lib/add-draft";

// Both modals pull in Radix Dialog, and Item Detail also pulls in Radix
// Select and floating-ui: about 40 KB gzipped that no page needs until the
// user opens one. Each is fetched on the first sign of intent (pointer over
// or focus on its trigger area) and mounted on first open, so none of it
// competes with the page's own JavaScript and cover images on load.

const loadAddItemModal = () => import("@/features/catalog/add-item-modal");
const loadItemDetailModal = () => import("@/features/catalog/item-detail-modal");

export function preloadAddItemModal() {
  void loadAddItemModal();
}

export function preloadItemDetailModal() {
  void loadItemDetailModal();
}

const LazyAddItemModal = dynamic(() => loadAddItemModal().then((mod) => mod.AddItemModal), {
  ssr: false,
});

const LazyItemDetailModal = dynamic(
  () => loadItemDetailModal().then((mod) => mod.ItemDetailModal),
  { ssr: false },
);

type AddItemButtonProps = Pick<
  ComponentProps<typeof LazyAddItemModal>,
  "onAdded" | "onOpenExisting" | "primaryOwnership"
>;

/**
 * The "+ Add item" button, rendered on the server; the dialog loads on first
 * use. When a pick was left unsaved in the dialog, a "Finish adding" chip
 * next to it reopens the dialog on that pick.
 */
export function AddItemButton({ onAdded, onOpenExisting, primaryOwnership }: AddItemButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // The draft the dialog was last opened on, if it was opened from the chip.
  // Each resume gets a new id, used as the dialog's key: it reads its draft
  // when it mounts, so resuming remounts it and a plain open unmounts the
  // resumed one.
  const [resumed, setResumed] = useState<{ id: number; draft: AddDraft } | null>(null);
  const draft = useAddDraft();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openDialog(resume: AddDraft | null) {
    if (resume) {
      setResumed({ id: (resumed?.id ?? 0) + 1, draft: resume });
    } else {
      // Starting over instead: the chip has been offered and passed up.
      clearAddDraft();
      setResumed(null);
    }
    setMounted(true);
    setOpen(true);
  }

  return (
    <>
      {draft && !open && (
        // Below lg it gets a row of its own under the toolbar (the toolbar
        // wraps while it's there); from lg up it sits before the button.
        // The max width caps how wide a long title can make the toolbar.
        <div
          data-add-draft
          className="order-last flex w-full min-w-0 items-center rounded-full border border-border bg-surface text-sm sm:max-w-[16rem] lg:order-none lg:w-auto"
        >
          <button
            type="button"
            className="focus-ring min-w-0 flex-1 truncate rounded-l-full py-1.5 pl-3 pr-1 text-left text-surface-foreground hover:underline"
            onPointerEnter={preloadAddItemModal}
            onFocus={preloadAddItemModal}
            onClick={() => openDialog(draft)}
          >
            Finish adding <span className="font-medium">“{draft.result.title}”</span>
          </button>
          <button
            type="button"
            aria-label={`Dismiss, don't add “${draft.result.title}”`}
            className="focus-ring shrink-0 rounded-r-full py-1.5 pl-1 pr-2.5 text-muted-foreground hover:text-surface-foreground"
            onClick={() => {
              clearAddDraft();
              triggerRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <Button
        ref={triggerRef}
        className="shrink-0 whitespace-nowrap"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={preloadAddItemModal}
        onFocus={preloadAddItemModal}
        onClick={() => openDialog(null)}
      >
        + Add item
      </Button>
      {mounted && (
        <LazyAddItemModal
          key={resumed?.id ?? 0}
          draft={resumed?.draft}
          open={open}
          onOpenChange={setOpen}
          returnFocusTo={triggerRef}
          onAdded={onAdded}
          onOpenExisting={onOpenExisting}
          primaryOwnership={primaryOwnership}
        />
      )}
    </>
  );
}

type ItemDetailModalProps = ComponentProps<typeof LazyItemDetailModal>;

/** Item Detail, mounted the first time an entry is selected and kept after. */
export function ItemDetailModal(props: ItemDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  // Adjusting state during render (not in an effect) mounts it in the same
  // render that first selects an entry.
  if (props.entry && !mounted) setMounted(true);
  return mounted ? <LazyItemDetailModal {...props} /> : null;
}
