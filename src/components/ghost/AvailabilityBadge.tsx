import type { Track } from "@/lib/music/types";
import { youtubeIdOf } from "@/lib/music/youtube";
import { cn } from "@/lib/utils";

/** Labels where a track's sound comes from: YouTube embed, demo audio, or none. */
export function AvailabilityBadge({ track, className }: { track: Track; className?: string }) {
  const isYouTube = !!youtubeIdOf(track);
  const label = isYouTube ? "YouTube" : track.playable ? "Demo" : "No audio";
  const title = isYouTube
    ? "Plays through the official YouTube player"
    : track.playable
      ? "Short demo audio loop"
      : "Demo track without audio";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider",
        isYouTube || track.playable ? "border-primary/40 text-primary" : "border-border text-muted-foreground",
        className,
      )}
      title={title}
    >
      {label}
    </span>
  );
}
