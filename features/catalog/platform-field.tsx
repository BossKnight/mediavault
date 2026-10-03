"use client";

import { useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { COMMON_GAME_PLATFORMS, normalizePlatforms, parsePlatformList } from "@/lib/platforms";
import { BOOK_FORMATS, PHYSICAL_FORMATS, type MediaType } from "@/types/media";

interface PlatformFieldProps {
  mediaType: MediaType;
  value: string[];
  onChange: (platforms: string[]) => void;
  /** Game only: the platforms the game came out on, offered as checkboxes. */
  availablePlatforms?: string[];
}

/**
 * Every format or platform the user owns a title in: checkboxes for the
 * fixed movie/TV and book formats; for games, checkboxes for the game's
 * own platforms plus a comma-separated "Other" field.
 */
export function PlatformField({ mediaType, value, onChange, availablePlatforms }: PlatformFieldProps) {
  if (mediaType === "GAME") {
    return (
      <GamePlatformsInput value={value} onChange={onChange} availablePlatforms={availablePlatforms} />
    );
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

function GamePlatformsInput({
  value,
  onChange,
  availablePlatforms,
}: Omit<PlatformFieldProps, "mediaType">) {
  const id = useId();
  // The choices are fixed when the field mounts: the game's own platforms
  // (or the common ones when RAWG didn't list any) plus whatever the entry
  // already has, so checking and unchecking never moves a box.
  const [choices] = useState(() =>
    normalizePlatforms([
      ...(availablePlatforms?.length ? availablePlatforms : COMMON_GAME_PLATFORMS),
      ...value,
    ]),
  );
  // The raw text is kept as typed (trailing commas and all) so typing isn't
  // fought; the parsed list is what's reported up.
  const [otherText, setOtherText] = useState("");
  const [checked, setChecked] = useState(() => normalizePlatforms(value));

  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const has = (list: string[], name: string) => list.some((item) => same(item, name));
  const selected = [...checked, ...parsePlatformList(otherText)];

  function report(nextChecked: string[], nextOther: string) {
    setChecked(nextChecked);
    setOtherText(nextOther);
    onChange(normalizePlatforms([...nextChecked, ...parsePlatformList(nextOther)]));
  }

  function toggle(platform: string, on: boolean) {
    if (on) {
      report([...checked, platform], otherText);
      return;
    }
    // Typing a listed platform under Other also checks its box, so
    // unchecking it has to take it out of the text too.
    const other = parsePlatformList(otherText);
    report(
      checked.filter((item) => !same(item, platform)),
      has(other, platform) ? other.filter((item) => !same(item, platform)).join(", ") : otherText,
    );
  }

  return (
    <fieldset className="flex flex-col gap-1.5 text-sm">
      <legend className="mb-1.5 font-medium text-surface-foreground">Platforms</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {choices.map((platform) => (
          <label key={platform} className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={has(selected, platform)}
              onChange={(event) => toggle(platform, event.target.checked)}
            />
            <span className="text-surface-foreground">{platform}</span>
          </label>
        ))}
      </div>
      <label htmlFor={`${id}-other`} className="mt-2 text-surface-foreground">
        Other platforms
      </label>
      <Input
        id={`${id}-other`}
        value={otherText}
        onChange={(event) => report(checked, event.target.value)}
        placeholder="e.g. PS2, Xbox"
        aria-describedby={`${id}-hint`}
      />
      <span id={`${id}-hint`} className="text-xs text-muted-foreground">
        Separate platforms with commas.
      </span>
    </fieldset>
  );
}
