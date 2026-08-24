"use client";

import type { ComponentPropsWithoutRef } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export const Select = RadixSelect.Root;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Trigger>) {
  return (
    <RadixSelect.Trigger
      className={cn(
        "focus-ring flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-white data-[placeholder]:text-muted",
        className,
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon>
        <ChevronDown className="h-4 w-4 text-muted" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export const SelectValue = RadixSelect.Value;

export function SelectContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Content>) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className={cn(
          "z-50 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 shadow-xl",
          className,
        )}
        position="popper"
        sideOffset={4}
        {...props}
      >
        <RadixSelect.Viewport>{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Item>) {
  return (
    <RadixSelect.Item
      className={cn(
        "focus-ring cursor-pointer select-none rounded-md px-3 py-2 text-sm text-white outline-none data-[highlighted]:bg-accent-muted data-[state=checked]:text-accent-hover",
        className,
      )}
      {...props}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}
