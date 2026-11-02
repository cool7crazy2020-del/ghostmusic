import { ChevronDown, ChevronUp, ExternalLink, MonitorPlay } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { youtubeWatchUrl } from "@/lib/music/youtube";
import { cn } from "@/lib/utils";
import { loadYouTubeIframeApi, type YTPlayer } from "@/lib/youtube-iframe";

import { usePlayer } from "./player-context";

/**
 * The official YouTube IFrame player. It stays visible (at least 200px tall, as
 * YouTube's embed policy requires) whenever a YouTube track is loaded. GHOST's
 * own controls drive it through the IFrame Player API; ads and restrictions
 * are handled by YouTube itself.
 */
export function YouTubePlayerCard() {
  const { currentYouTubeId, status, registerYouTube, handleYouTubeState, handleYouTubeError, pause } = usePlayer();
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const handlersRef = useRef({ handleYouTubeState, handleYouTubeError });
  handlersRef.current = { handleYouTubeState, handleYouTubeError };

  // Create the embed the first time a YouTube track is selected, then keep it alive.
  useEffect(() => {
    if (currentYouTubeId) setActive(true);
  }, [currentYouTubeId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!active || !mount) return;
    let cancelled = false;
    let player: YTPlayer | null = null;
    // YouTube replaces this element with its iframe, so keep it outside React's tree.
    const target = document.createElement("div");
    mount.appendChild(target);
    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(target, {
          width: "100%",
          height: "100%",
          playerVars: { playsinline: 1, rel: 0, enablejsapi: 1, origin: window.location.origin },
          events: {
            onReady: (e) => {
              if (!cancelled) registerYouTube(e.target);
            },
            onStateChange: (e) => handlersRef.current.handleYouTubeState(e.data),
            onError: (e) => handlersRef.current.handleYouTubeError(e.data),
          },
        });
      })
      .catch(() => {
        if (!cancelled) handlersRef.current.handleYouTubeError(-1);
      });
    return () => {
      cancelled = true;
      registerYouTube(null);
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      mount.replaceChildren();
    };
  }, [active, registerYouTube]);

  // Pressing play elsewhere while minimized brings the video back into view.
  useEffect(() => {
    if (status === "playing" && minimized) setMinimized(false);
  }, [status, minimized]);

  if (!active) return null;

  return (
    <section
      aria-label="YouTube video player"
      className={cn(
        "fixed bottom-[5rem] right-3 z-50 w-[min(22.25rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-glow md:bottom-[6rem]",
        !currentYouTubeId && "hidden",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <MonitorPlay className="size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">Playing via YouTube</p>
          {!minimized && (
            <p className="truncate text-[10px] text-muted-foreground">Official embed · ads & restrictions may apply</p>
          )}
        </div>
        {currentYouTubeId && (
          <Button asChild variant="subtle" size="icon-sm">
            <a
              href={youtubeWatchUrl(currentYouTubeId)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open this video on YouTube"
              title="Open on YouTube"
            >
              <ExternalLink />
            </a>
          </Button>
        )}
        <Button
          variant="subtle"
          size="icon-sm"
          aria-label={minimized ? "Show video" : "Hide video (pauses playback)"}
          title={minimized ? "Show video" : "Hide video (pauses playback)"}
          onClick={() => {
            if (!minimized) pause();
            setMinimized(!minimized);
          }}
        >
          {minimized ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>
      <div
        ref={mountRef}
        className={cn(
          "relative w-full bg-background [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full",
          minimized ? "h-0" : "aspect-video min-h-[200px]",
        )}
      />
    </section>
  );
}
