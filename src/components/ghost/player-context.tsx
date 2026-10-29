import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { activeSource } from "@/lib/music/source";
import type { Track } from "@/lib/music/types";
import { indexAfterRemoval, nextIndex, previousAction } from "@/lib/queue";

import { useLibrary } from "./library-context";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "unavailable" | "error";

interface PlayerContextValue {
  queue: Track[];
  index: number;
  current: Track | null;
  status: PlayerStatus;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  queueOpen: boolean;
  setQueueOpen: (open: boolean) => void;
  playTrack: (track: Track, context?: Track[]) => void;
  playTracks: (tracks: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (i: number) => void;
  jumpTo: (i: number) => void;
  clearUpNext: () => void;
  attachYouTubePlayer: (player: YouTubePlayerLike | null) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);
const VOLUME_KEY = "ghost-music:volume";
type YouTubePlayerLike = {
  playVideo: () => void; pauseVideo: () => void; loadVideoById: (id: string) => void;
  cueVideoById: (id: string) => void; seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void; mute: () => void; unMute: () => void;
  getCurrentTime: () => number; getDuration: () => number; getPlayerState: () => number;
};
function youtubeId(track: Track | null): string | null {
  if (!track?.sourceUrl || !/youtube\.com|youtu\.be/.test(track.sourceUrl)) return null;
  try { const u = new URL(track.sourceUrl); return u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop() || null; }
  catch { return null; }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { recordPlay } = useLibrary();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayerLike | null>(null);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [loadId, setLoadId] = useState(0);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const autoplayRef = useRef(false);
  const recordedLoadRef = useRef(-1);
  const hasStreamRef = useRef(false);
  const current = queue[index] ?? null;
  const currentYoutubeId = youtubeId(current);
  const currentRef = useRef<Track | null>(null);
  currentRef.current = current;
  const loadIdRef = useRef(0);
  loadIdRef.current = loadId;
  const nextRef = useRef<() => void>(() => {});
  const recordPlayRef = useRef(recordPlay);
  recordPlayRef.current = recordPlay;

  // Create the single audio element and wire its events once.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    try {
      const saved = window.localStorage.getItem(VOLUME_KEY);
      if (saved !== null) {
        const v = Math.min(1, Math.max(0, Number(saved)));
        if (Number.isFinite(v)) {
          audio.volume = v;
          setVolumeState(v);
        }
      } else audio.volume = 0.8;
    } catch {
      audio.volume = 0.8;
    }

    const onPlaying = () => {
      setStatus("playing");
      if (recordedLoadRef.current !== loadIdRef.current && currentRef.current) {
        recordedLoadRef.current = loadIdRef.current;
        recordPlayRef.current(currentRef.current);
      }
    };
    const onPause = () => {
      if (hasStreamRef.current && !audio.ended) setStatus("paused");
    };
    const onWaiting = () => hasStreamRef.current && setStatus("loading");
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => nextRef.current();
    const onError = () => {
      if (!hasStreamRef.current) return;
      setStatus("error");
      toast.error("Couldn't load this audio", { description: currentRef.current?.title });
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.pause();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, []);

  // Load the current track through YouTube's official player when it has a YouTube URL;
  // otherwise use the configured audio source.
  useEffect(() => {
    const audio = audioRef.current;
    const track = currentRef.current;
    if (!audio) return;
    const ytId = youtubeId(track);
    const clearStream = () => {
      hasStreamRef.current = false;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
    if (!track) {
      clearStream();
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setCurrentTime(0);
    setDuration(track.durationSec);
    setStatus("loading");

    if (ytId) {
      clearStream();
      hasStreamRef.current = true;
      if (youtubePlayerRef.current && youtubeReady) {
        if (autoplayRef.current) youtubePlayerRef.current.loadVideoById(ytId);
        else youtubePlayerRef.current.cueVideoById(ytId);
      }
      return () => { cancelled = true; };
    }

    activeSource.resolveStream(track).then((url) => {
      if (cancelled) return;
      if (!url) {
        clearStream();
        setStatus("unavailable");
        toast.error("Audio unavailable", {
          description: "This track does not have a playable stream from the configured source.",
        });
        return;
      }
      hasStreamRef.current = true;
      audio.src = url;
      audio.load();
      if (autoplayRef.current) audio.play().catch(() => setStatus("paused"));
      else setStatus("paused");
    }).catch((error: unknown) => {
      if (cancelled) return;
      clearStream();
      setStatus("error");
      toast.error("Couldn't resolve this audio", {
        description: error instanceof Error ? error.message : "Unknown audio resolver error.",
      });
    });
    return () => { cancelled = true; };
  }, [loadId, youtubeReady]);
  const load = useCallback((autoplay: boolean) => {
    autoplayRef.current = autoplay;
    setLoadId((n) => n + 1);
  }, []);

  const playTracks = useCallback(
    (tracks: Track[], startIndex = 0) => {
      if (tracks.length === 0) return;
      setQueue(tracks);
      setIndex(Math.min(Math.max(0, startIndex), tracks.length - 1));
      load(true);
    },
    [load],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    const track = currentRef.current;
    if (!audio || !track) return;
    if (youtubeId(track)) {
      const player = youtubePlayerRef.current;
      if (!player || !youtubeReady) {
        setStatus("loading");
        return;
      }
      try {
        const state = player.getPlayerState();
        if (state === 1) player.pauseVideo();
        else player.playVideo();
      } catch {
        setStatus("error");
        toast.error("YouTube playback failed", { description: "Try selecting the track again." });
      }
      return;
    }
    if (!hasStreamRef.current) {
      toast("Playback unavailable", {
        description: `“${track.title}” has no audio in the demo catalog. Connect a supported music source for full playback.`,
      });
      return;
    }
    if (audio.paused) audio.play().catch(() => setStatus("paused"));
    else audio.pause();
  }, [youtubeReady]);

  const playTrack = useCallback(
    (track: Track, context?: Track[]) => {
      if (currentRef.current?.id === track.id) {
        togglePlay();
        return;
      }
      const list = context && context.some((t) => t.id === track.id) ? context : [track];
      playTracks(list, list.findIndex((t) => t.id === track.id));
    },
    [playTracks, togglePlay],
  );

  const next = useCallback(() => {
    const ni = nextIndex(queue.length, index);
    if (ni === null) {
      const audio = audioRef.current;
      if (audio && hasStreamRef.current) {
        audio.pause();
        audio.currentTime = 0;
      }
      return;
    }
    setIndex(ni);
    load(true);
  }, [queue.length, index, load]);
  nextRef.current = next;

  const previous = useCallback(() => {
    const audio = audioRef.current;
    const action = previousAction(index, audio?.currentTime ?? 0);
    if (action.kind === "restart") {
      if (youtubeId(currentRef.current)) youtubePlayerRef.current?.seekTo(0, true);
      else if (audio && hasStreamRef.current) audio.currentTime = 0;
      return;
    }
    setIndex(action.index);
    load(true);
  }, [index, load]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (youtubeId(currentRef.current)) {
      youtubePlayerRef.current?.seekTo(seconds, true);
      setCurrentTime(seconds);
      return;
    }
    if (!audio || !hasStreamRef.current) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    setMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = clamped === 0;
    }
    const yt = youtubePlayerRef.current;
    if (yt) {
      yt.setVolume(Math.round(clamped * 100));
      if (clamped === 0) yt.mute();
      else yt.unMute();
    }
    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      /* storage blocked: volume just won't persist */
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (youtubeId(currentRef.current)) { if (m) youtubePlayerRef.current?.unMute(); else youtubePlayerRef.current?.mute(); }
      if (audioRef.current) audioRef.current.muted = !m;
      return !m;
    });
  }, []);

  const addToQueue = useCallback(
    (track: Track) => {
      setQueue((q) => [...q, track]);
      if (index === -1) {
        setIndex(0);
        load(false);
      }
      toast("Added to queue", { description: track.title });
    },
    [index, load],
  );

  const playNext = useCallback(
    (track: Track) => {
      setQueue((q) => {
        const copy = [...q];
        copy.splice(index + 1, 0, track);
        return copy;
      });
      if (index === -1) {
        setIndex(0);
        load(false);
      }
      toast("Playing next", { description: track.title });
    },
    [index, load],
  );

  const removeFromQueue = useCallback(
    (i: number) => {
      if (i === index) return;
      setQueue((q) => q.filter((_, j) => j !== i));
      setIndex((cur) => indexAfterRemoval(cur, i));
    },
    [index],
  );

  const jumpTo = useCallback(
    (i: number) => {
      setIndex(i);
      load(true);
    },
    [load],
  );

  const clearUpNext = useCallback(() => setQueue((q) => q.slice(0, index + 1)), [index]);

  const attachYouTubePlayer = useCallback((player: YouTubePlayerLike | null) => {
    youtubePlayerRef.current = player;
    setYoutubeReady(!!player);
  }, []);

  useEffect(() => {
    if (!youtubeReady || !currentYoutubeId || !youtubePlayerRef.current) return;
    const player = youtubePlayerRef.current;
    const timer = window.setInterval(() => {
      try {
        const t = player.getCurrentTime(); const d = player.getDuration();
        if (Number.isFinite(t)) setCurrentTime(t);
        if (Number.isFinite(d) && d > 0) setDuration(d);
        const state = player.getPlayerState();
        if (state === 1) setStatus("playing");
        else if (state === 2 || state === 5) setStatus("paused");
        else if (state === 0) nextRef.current();
      } catch { /* player may still be initializing */ }
    }, 500);
    return () => window.clearInterval(timer);
  }, [youtubeReady, currentYoutubeId]);

  // Space bar toggles playback when focus isn't in a text field or on a control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.closest("input, textarea, select, button, [role=slider], [role=menuitem], [contenteditable=true]"))) return;
      if (!currentRef.current) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  // OS media controls (lock screen, keyboard media keys) where supported.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !current) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: `${current.albumTitle} (demo)`,
      });
      navigator.mediaSession.setActionHandler("play", togglePlay);
      navigator.mediaSession.setActionHandler("pause", togglePlay);
      navigator.mediaSession.setActionHandler("nexttrack", () => nextRef.current());
      navigator.mediaSession.setActionHandler("previoustrack", previous);
    } catch {
      /* media session unsupported */
    }
  }, [current, togglePlay, previous]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      index,
      current,
      status,
      isPlaying: status === "playing" || (status === "loading" && autoplayRef.current && hasStreamRef.current),
      currentTime,
      duration,
      volume,
      muted,
      queueOpen,
      setQueueOpen,
      playTrack,
      playTracks,
      togglePlay,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      addToQueue,
      playNext,
      removeFromQueue,
      jumpTo,
      clearUpNext,
    }),
    [
      queue, index, current, status, currentTime, duration, volume, muted, queueOpen,
      playTrack, playTracks, togglePlay, next, previous, seek, setVolume, toggleMute,
      addToQueue, playNext, removeFromQueue, jumpTo, clearUpNext,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
