import { Link } from "@tanstack/react-router";
import { Clock3, Pause, Play, VolumeX } from "lucide-react";
import type { ReactNode } from "react";

import type { Track } from "@/lib/music/types";
import { formatTime } from "@/lib/queue";
import { cn } from "@/lib/utils";

import { Artwork } from "./Artwork";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { LikeButton } from "./LikeButton";
import { usePlayer } from "./player-context";
import { TrackActionsMenu } from "./TrackActionsMenu";

interface TrackListProps {
  tracks: Track[];
  /** Playlist id when rendering a playlist, enabling "remove" in the menu. */
  playlistId?: string;
  showAlbum?: boolean;
  /** Optional extra text per row (e.g. "played 5 min ago"). */
  meta?: (track: Track, i: number) => ReactNode;
  label: string;
}

export function EqualizerIcon() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      <span className="eq-bar block h-full w-[3px] rounded-sm bg-primary" />
      <span className="eq-bar block h-full w-[3px] rounded-sm bg-primary" />
      <span className="eq-bar block h-full w-[3px] rounded-sm bg-primary" />
    </span>
  );
}

export function TrackList({ tracks, playlistId, showAlbum = true, meta, label }: TrackListProps) {
  const { current, isPlaying, playTrack } = usePlayer();

  return (
    <div role="list" aria-label={label} className="flex flex-col">
      <div
        className={cn(
          "hidden items-center gap-4 border-b border-border px-3 pb-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid",
          showAlbum ? "sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,0.8fr)_auto]" : "sm:grid-cols-[2rem_minmax(0,1fr)_auto]",
        )}
        aria-hidden
      >
        <span className="text-center">#</span>
        <span>Title</span>
        {showAlbum && <span className="hidden md:block">Album</span>}
        <span className="flex justify-end pr-[4.5rem]">
          <Clock3 className="size-3.5" />
        </span>
      </div>
      {tracks.map((track, i) => {
        const isCurrent = current?.id === track.id;
        const playingThis = isCurrent && isPlaying;
        return (
          <div
            role="listitem"
            key={`${track.id}-${i}`}
            onClick={() => playTrack(track, tracks)}
            className={cn(
              "group grid cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50 sm:gap-4",
              showAlbum
                ? "grid-cols-[2rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,0.8fr)_auto]"
                : "grid-cols-[2rem_minmax(0,1fr)_auto]",
              isCurrent && "bg-accent/40",
            )}
          >
            <div className="flex w-8 items-center justify-center text-sm tabular-nums text-muted-foreground">
              <span className={cn("group-hover:hidden group-focus-within:hidden", isCurrent && "text-primary")}>
                {playingThis ? <EqualizerIcon /> : i + 1}
              </span>
              <button
                type="button"
                className="hidden size-8 items-center justify-center rounded-full text-foreground focus-visible:flex focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover:flex group-focus-within:flex"
                aria-label={
                  !track.playable
                    ? `${track.title} — audio unavailable in demo`
                    : playingThis
                      ? `Pause ${track.title}`
                      : `Play ${track.title}`
                }
                onClick={(e) => {
                  e.stopPropagation();
                  playTrack(track, tracks);
                }}
              >
                {!track.playable ? (
                  <VolumeX className="size-4 text-muted-foreground" />
                ) : playingThis ? (
                  <Pause className="size-4 fill-current" />
                ) : (
                  <Play className="size-4 fill-current" />
                )}
              </button>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <Artwork art={track.art} size="sm" className="size-10" />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("truncate font-medium", isCurrent ? "text-primary" : "text-foreground")}>
                    {track.title}
                  </span>
                  <AvailabilityBadge playable={track.playable} />
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {track.artist}
                  {meta && <span className="text-muted-foreground/70"> · {meta(track, i)}</span>}
                </div>
              </div>
            </div>

            {showAlbum && (
              <div className="hidden min-w-0 sm:block">
                <Link
                  to="/album/$albumId"
                  params={{ albumId: track.albumId }}
                  onClick={(e) => e.stopPropagation()}
                  className="truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {track.albumTitle}
                </Link>
              </div>
            )}

            <div className="flex items-center gap-1">
              <LikeButton track={track} className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[active=true]:opacity-100" />
              <span className="hidden w-10 text-right text-sm tabular-nums text-muted-foreground sm:inline">
                {formatTime(track.durationSec)}
              </span>
              <TrackActionsMenu track={track} playlistId={playlistId} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
