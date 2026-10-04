"use client";

import { useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatSeasonList, parseSeasonInput } from "@/lib/seasons";
import { cn } from "@/lib/utils";

// Past this many seasons (long-running soaps, The Simpsons) a wall of
// chips is harder to use than typing the numbers.
const MAX_SEASON_CHIPS = 40;

export interface SeasonSelection {
  seasons: number[];
  completeSeries: boolean;
}

interface SeasonPickerProps extends SeasonSelection {
  /**
   * How many seasons the show has: chips for each. `undefined` while that's
   * still being looked up, `null` when it couldn't be (the field falls back
   * to typing the numbers).
   */
  seasonCount: number | null | undefined;
  onChange: (selection: SeasonSelection) => void;
}

/** Which seasons of a show the user owns, picked when adding it. */
export function SeasonPicker({ seasonCount, seasons, completeSeries, onChange }: SeasonPickerProps) {
  const hintId = useId();
  const inputId = useId();
  // Typed seasons, kept as typed; only the parsed numbers are reported up.
  const [text, setText] = useState(() => formatSeasonList(seasons));
  const parsed = parseSeasonInput(text);
  const useChips = typeof seasonCount === "number" && seasonCount <= MAX_SEASON_CHIPS;
  // Seasons already chosen beyond the count (typed before the count
  // arrived, say) still get a chip, so they can be seen and unchosen.
  const chipCount = useChips ? Math.max(seasonCount, ...seasons) : 0;

  function toggle(season: number) {
    const next = seasons.includes(season) ? seasons.filter((s) => s !== season) : [...seasons, season];
    onChange({ seasons: next.sort((a, b) => a - b), completeSeries: false });
  }

  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1.5 font-medium text-surface-foreground">Seasons you own</legend>
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={completeSeries}
          onChange={(event) => onChange({ seasons, completeSeries: event.target.checked })}
        />
        <span className="text-surface-foreground">Complete series (every season)</span>
      </label>

      {!completeSeries && seasonCount === undefined && (
        <p className="text-xs text-muted-foreground">Checking how many seasons it has...</p>
      )}

      {!completeSeries && useChips && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Seasons">
          {Array.from({ length: chipCount }, (_, index) => index + 1).map((season) => (
            <button
              key={season}
              type="button"
              aria-pressed={seasons.includes(season)}
              aria-label={`Season ${season}`}
              onClick={() => toggle(season)}
              className={cn(
                "focus-ring inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-medium tabular-nums transition-colors sm:h-8 sm:min-w-8",
                seasons.includes(season)
                  ? "border-accent bg-accent-muted text-accent-muted-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {season}
            </button>
          ))}
        </div>
      )}

      {!completeSeries && seasonCount !== undefined && !useChips && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="sr-only">
            Season numbers
          </label>
          <Input
            id={inputId}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              onChange({ seasons: parseSeasonInput(event.target.value).seasons, completeSeries: false });
            }}
            placeholder="e.g. 4, 5"
            aria-describedby={hintId}
            aria-invalid={parsed.invalidTokens.length > 0 ? true : undefined}
          />
          <span id={hintId} className="text-xs text-muted-foreground">
            {parsed.invalidTokens.length > 0
              ? `Not season numbers, so they won't be saved: ${parsed.invalidTokens.join(", ")}`
              : "List the season numbers you own, separated by commas."}
          </span>
        </div>
      )}
    </fieldset>
  );
}
