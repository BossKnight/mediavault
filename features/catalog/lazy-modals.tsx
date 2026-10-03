"use client";

import { type ComponentProps, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

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

/** The "+ Add item" button, rendered on the server; the dialog loads on first use. */
export function AddItemButton({ onAdded, onOpenExisting, primaryOwnership }: AddItemButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={triggerRef}
        className="shrink-0 whitespace-nowrap"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={preloadAddItemModal}
        onFocus={preloadAddItemModal}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        + Add item
      </Button>
      {mounted && (
        <LazyAddItemModal
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
