import { ListMusic, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Artwork } from "./Artwork";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { usePlayer } from "./player-context";
import { EqualizerIcon } from "./TrackList";

export function QueuePanel() {
  const { queue, index, current, isPlaying, queueOpen, setQueueOpen, jumpTo, removeFromQueue, clearUpNext } =
    usePlayer();

  useEffect(() => {
    if (!queueOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setQueueOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queueOpen, setQueueOpen]);

  if (!queueOpen) return null;
  const upNext = queue.map((t, i) => ({ t, i })).filter(({ i }) => i > index);

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
        onClick={() => setQueueOpen(false)}
        aria-hidden
      />
      <aside
        aria-label="Queue"
        className="fixed inset-y-0 right-0 z-40 flex w-[min(22rem,90vw)] flex-col border-l border-border bg-surface shadow-glow lg:static lg:z-auto lg:w-80 lg:shadow-none"
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-lg font-bold">Queue</h2>
          <Button variant="subtle" size="icon-sm" aria-label="Close queue" onClick={() => setQueueOpen(false)}>
            <X />
          </Button>
        </div>
        <div className="ghost-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6">
          {!current ? (
            <div className="flex flex-col items-center px-4 py-16 text-center text-sm text-muted-foreground">
              <ListMusic className="mb-3 size-8 text-primary" />
              Your queue is empty. Play a song or use “Add to queue” from any track menu.
            </div>
          ) : (
            <>
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Now playing
              </p>
              <div className="flex items-center gap-3 rounded-lg bg-accent/50 p-2">
                <Artwork art={current.art} size="sm" className="size-11" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-primary">{current.title}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{current.artist}</div>
                </div>
                {isPlaying ? <EqualizerIcon /> : <AvailabilityBadge playable={current.playable} />}
              </div>

              <div className="mt-6 flex items-center justify-between px-2 pb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Up next</p>
                {upNext.length > 0 && (
                  <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={clearUpNext}>
                    Clear
                  </Button>
                )}
              </div>
              {upNext.length === 0 ? (
                <p className="px-2 text-sm text-muted-foreground">Nothing queued after this track.</p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {upNext.map(({ t, i }) => (
                    <li key={`${t.id}-${i}`} className="group flex items-center gap-1 rounded-lg hover:bg-accent/50">
                      <button
                        type="button"
                        onClick={() => jumpTo(i)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        aria-label={`Play ${t.title} by ${t.artist}`}
                      >
                        <Artwork art={t.art} size="sm" className="size-10" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{t.title}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{t.artist}</span>
                            {!t.playable && <AvailabilityBadge playable={false} />}
                          </div>
                        </div>
                      </button>
                      <Button
                        variant="subtle"
                        size="icon-sm"
                        className={cn("mr-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100")}
                        aria-label={`Remove ${t.title} from queue`}
                        onClick={() => removeFromQueue(i)}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
