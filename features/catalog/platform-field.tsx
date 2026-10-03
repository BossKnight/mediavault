"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { parsePlatformList } from "@/lib/platforms";
import { BOOK_FORMATS, PHYSICAL_FORMATS, type MediaType } from "@/types/media";

interface PlatformFieldProps {
  mediaType: MediaType;
  value: string[];
  onChange: (platforms: string[]) => void;
}

/**
 * Every format or platform the user owns a title in: checkboxes for the
 * fixed movie/TV and book formats, comma-separated text for game platforms.
 */
export function PlatformField({ mediaType, value, onChange }: PlatformFieldProps) {
  if (mediaType === "GAME") {
    return <GamePlatformsInput value={value} onChange={onChange} />;
  }

  const options = mediaType === "BOOK" ? BOOK_FORMATS : PHYSICAL_FORMATS;
  // Formats picked before this list existed (or typed in elsewhere) stay
  // visible, so unchecking the known ones can't silently drop them.
  const extras = value.filter((format) => !(options as readonly string[]).includes(format));

  function toggle(format: string, checked: boolean) {
    onChange(checked ? [...value, format] : value.filter((item) => item !== format));
  }

  return (
    <fieldset className="flex flex-col gap-1.5 text-sm">
      <legend className="mb-1.5 font-medium text-surface-foreground">Formats</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {[...options, ...extras].map((format) => (
          <label key={format} className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={value.includes(format)}
              onChange={(event) => toggle(format, event.target.checked)}
            />
            <span className="text-surface-foreground">{format}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function GamePlatformsInput({ value, onChange }: Omit<PlatformFieldProps, "mediaType">) {
  // The raw text is kept as typed (trailing commas and all) so typing isn't
  // fought; the parsed list is what's reported up.
  const [text, setText] = useState(() => value.join(", "));

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-surface-foreground">Platforms</span>
      <Input
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onChange(parsePlatformList(event.target.value));
        }}
        placeholder="PS5, PC, Switch..."
        aria-describedby="game-platforms-hint"
      />
      <span id="game-platforms-hint" className="text-xs text-muted-foreground">
        Separate platforms with commas, e.g. PS2, Xbox.
      </span>
    </label>
  );
}
