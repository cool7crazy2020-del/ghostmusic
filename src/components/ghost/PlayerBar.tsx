import { Link } from "@tanstack/react-router";
import { ListMusic, Loader2, Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatTime } from "@/lib/queue";
import { cn } from "@/lib/utils";

import { Artwork } from "./Artwork";
import { LikeButton } from "./LikeButton";
import { usePlayer } from "./player-context";

export function PlayerBar() {
  const p = usePlayer();
  const [scrub, setScrub] = useState<number | null>(null);
  const track = p.current;
  const unavailable = p.status === "unavailable";
  const canSeek = !!track && !unavailable && p.status !== "error" && p.duration > 0;
  const position = scrub ?? p.currentTime;
  const hasNext = p.index >= 0 && p.index < p.queue.length - 1;
  const VolumeIcon = p.muted || p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;

  const playLabel = !track
    ? "Play"
    : unavailable
      ? "Playback unavailable for this track"
      : p.isPlaying
        ? "Pause"
        : "Play";

  const statusText = !track
    ? "Pick a track to start listening"
    : unavailable
      ? "Unavailable in demo — no audio for this track"
      : p.status === "error"
        ? "Couldn't load audio"
        : null;

  return (
    <footer
      aria-label="Player"
      className="relative z-40 border-t border-border bg-surface/95 backdrop-blur-xl"
    >
      {/* Thin progress line for small screens */}
      <div className="h-0.5 w-full bg-foreground/10 md:hidden" aria-hidden>
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: canSeek ? `${Math.min(100, (position / p.duration) * 100)}%` : "0%" }}
        />
      </div>

      <div className="grid h-[4.5rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-4 md:h-[5.25rem] md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Now playing */}
        <div className="flex min-w-0 items-center gap-3">
          {track ? (
            <>
              <Artwork art={track.art} size="sm" className="size-12 shadow-lg md:size-14" />
              <div className="min-w-0">
                <Link
                  to="/album/$albumId"
                  params={{ albumId: track.albumId }}
                  className="block truncate text-sm font-semibold text-foreground hover:underline"
                >
                  {track.title}
                </Link>
                <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
                {unavailable && (
                  <div className="mt-0.5 truncate text-[11px] font-medium text-warning md:hidden">
                    Unavailable in demo
                  </div>
                )}
              </div>
              <LikeButton track={track} className="hidden sm:inline-flex" />
            </>
          ) : (
            <>
              <div className="flex size-12 items-center justify-center rounded-md border border-dashed border-border md:size-14">
                <ListMusic className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 text-sm text-muted-foreground">Nothing playing</div>
            </>
          )}
        </div>

        {/* Transport + seek */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="subtle"
              size="icon"
              className="hidden md:inline-flex"
              aria-label="Previous track"
              disabled={!track}
              onClick={p.previous}
            >
              <SkipBack className="fill-current" />
            </Button>
            <Button
              variant="play"
              size="icon-lg"
              aria-label={playLabel}
              aria-disabled={!track || unavailable}
              disabled={!track}
              onClick={p.togglePlay}
              className={cn(unavailable && "opacity-40 hover:scale-100")}
            >
              {p.status === "loading" && p.isPlaying ? (
                <Loader2 className="animate-spin" />
              ) : p.isPlaying ? (
                <Pause className="fill-current" />
              ) : (
                <Play className="translate-x-px fill-current" />
              )}
            </Button>
            <Button
              variant="subtle"
              size="icon"
              aria-label="Next track"
              disabled={!hasNext}
              onClick={p.next}
            >
              <SkipForward className="fill-current" />
            </Button>
            <Button
              variant="subtle"
              size="icon"
              className="md:hidden"
              aria-label={p.queueOpen ? "Hide queue" : "Show queue"}
              aria-pressed={p.queueOpen}
              data-active={p.queueOpen}
              onClick={() => p.setQueueOpen(!p.queueOpen)}
            >
              <ListMusic />
            </Button>
          </div>
          <div className="hidden w-full max-w-xl items-center gap-2 md:flex">
            <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
              {canSeek ? formatTime(position) : "–:––"}
            </span>
            {statusText ? (
              <div
                role="status"
                className={cn(
                  "flex h-6 flex-1 items-center justify-center rounded-full text-[11px]",
                  unavailable || p.status === "error" ? "bg-warning/10 text-warning" : "text-muted-foreground",
                )}
              >
                {statusText}
              </div>
            ) : (
              <Slider
                className="flex-1"
                min={0}
                max={Math.max(p.duration, 0.1)}
                step={0.1}
                value={[Math.min(position, p.duration)]}
                disabled={!canSeek}
                onValueChange={(v) => setScrub(v[0])}
                onValueCommit={(v) => {
                  p.seek(v[0]);
                  setScrub(null);
                }}
                thumbLabel="Seek"
                valueText={`${formatTime(position)} of ${formatTime(p.duration)}`}
              />
            )}
            <span className="w-10 text-[11px] tabular-nums text-muted-foreground">
              {track ? formatTime(canSeek ? p.duration : track.durationSec) : "–:––"}
            </span>
          </div>
        </div>

        {/* Volume + queue */}
        <div className="hidden items-center justify-end gap-2 md:flex">
          <Button
            variant="subtle"
            size="icon"
            aria-label={p.queueOpen ? "Hide queue" : "Show queue"}
            aria-pressed={p.queueOpen}
            data-active={p.queueOpen}
            onClick={() => p.setQueueOpen(!p.queueOpen)}
          >
            <ListMusic />
          </Button>
          <Button variant="subtle" size="icon" aria-label={p.muted ? "Unmute" : "Mute"} onClick={p.toggleMute}>
            <VolumeIcon />
          </Button>
          <Slider
            className="w-28"
            min={0}
            max={1}
            step={0.01}
            value={[p.muted ? 0 : p.volume]}
            onValueChange={(v) => p.setVolume(v[0])}
            thumbLabel="Volume"
            valueText={`${Math.round((p.muted ? 0 : p.volume) * 100)}%`}
          />
        </div>
      </div>
    </footer>
  );
}
