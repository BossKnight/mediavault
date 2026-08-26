import { Film, Gamepad, Tv } from "@/components/ui/icons";
import { hueFromString } from "@/lib/hash";
import type { MediaType } from "@/types/media";
import { cn } from "@/lib/utils";

const MEDIA_ICONS: Record<MediaType, typeof Film> = {
  MOVIE: Film,
  TV: Tv,
  GAME: Gamepad,
};

interface CoverArtProps {
  id: string;
  title: string;
  mediaType: MediaType;
  className?: string;
}

/**
 * Generated stand-in cover art for a title with no poster on file, whether
 * because the metadata provider doesn't have one or no API key is
 * configured. Every title gets a deterministic two-tone card instead: a hue
 * derived from its id, a media-type glyph, and its initials.
 */
export function CoverArt({ id, title, mediaType, className }: CoverArtProps) {
  const hue = hueFromString(id);
  const Icon = MEDIA_ICONS[mediaType];
  const initials = title
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{
        background: `linear-gradient(155deg, hsl(${hue} 38% 30%), hsl(${hue} 46% 16%))`,
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, transparent 0 10px, rgba(255,255,255,0.5) 10px 11px)",
        }}
      />
      <span
        className="select-none text-3xl font-semibold tracking-tight text-white/90"
        style={{ textShadow: "0 1px 12px rgba(0,0,0,0.35)" }}
      >
        {initials || "?"}
      </span>
      <Icon className="absolute bottom-2 right-2 h-4 w-4 text-white/70" strokeWidth={2} />
    </div>
  );
}
