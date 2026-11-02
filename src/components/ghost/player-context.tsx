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
import { youtubeErrorMessage, youtubeIdOf } from "@/lib/music/youtube";
import { indexAfterRemoval, nextIndex, previousAction } from "@/lib/queue";
import { YT_STATE } from "@/lib/youtube-iframe";

import { useLibrary } from "./library-context";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "unavailable" | "error";

/** The subset of the official YouTube IFrame player the app drives. */
export interface YouTubeController {
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
}

interface PlayerContextValue {
  queue: Track[];
  index: number;
  current: Track | null;
  /** YouTube video id of the current track, when it plays through the YouTube embed. */
  currentYouTubeId: string | null;
  status: PlayerStatus;
  /** Why the current track can't play (shown in the player bar). */
  unavailableReason: string | null;
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
  pause: () => void;
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
  registerYouTube: (player: YouTubeController | null) => void;
  handleYouTubeState: (state: number) => void;
  handleYouTubeError: (code: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);
const VOLUME_KEY = "ghost-music:volume";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { recordPlay } = useLibrary();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytRef = useRef<YouTubeController | null>(null);
  const pendingYtRef = useRef<{ id: string; autoplay: boolean } | null>(null);
  const [ytReady, setYtReady] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [loadId, setLoadId] = useState(0);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const autoplayRef = useRef(false);
  const recordedLoadRef = useRef(-1);
  const hasStreamRef = useRef(false);
  const current = queue[index] ?? null;
  const currentYouTubeId = youtubeIdOf(current);

  const currentRef = useRef<Track | null>(null);
  currentRef.current = current;
  const loadIdRef = useRef(0);
  loadIdRef.current = loadId;
  const statusRef = useRef<PlayerStatus>("idle");
  statusRef.current = status;
  const reasonRef = useRef<string | null>(null);
  reasonRef.current = unavailableReason;
  const hasNextRef = useRef(false);
  hasNextRef.current = index >= 0 && index < queue.length - 1;
  const volumeRef = useRef(0.8);
  volumeRef.current = volume;
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const nextRef = useRef<() => void>(() => {});
  const recordPlayRef = useRef(recordPlay);
  recordPlayRef.current = recordPlay;

  /** Record the current track in history once per load, when sound actually starts. */
  const markPlayed = useCallback(() => {
    if (recordedLoadRef.current !== loadIdRef.current && currentRef.current) {
      recordedLoadRef.current = loadIdRef.current;
      recordPlayRef.current(currentRef.current);
    }
  }, []);

  // Single <audio> element for demo-catalog sound.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    try {
      const saved = window.localStorage.getItem(VOLUME_KEY);
      const v = saved === null ? 0.8 : Math.min(1, Math.max(0, Number(saved)));
      if (Number.isFinite(v)) {
        audio.volume = v;
        setVolumeState(v);
      }
    } catch {
      audio.volume = 0.8;
    }

    const onPlaying = () => {
      if (!hasStreamRef.current) return;
      setStatus("playing");
      markPlayed();
    };
    const onPause = () => {
      if (hasStreamRef.current && !audio.ended) setStatus("paused");
    };
    const onWaiting = () => hasStreamRef.current && setStatus("loading");
    const onTime = () => hasStreamRef.current && setCurrentTime(audio.currentTime);
    const onDuration = () => {
      if (hasStreamRef.current && Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => hasStreamRef.current && nextRef.current();
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
  }, [markPlayed]);

  // Load the current track: YouTube tracks go to the official embed, demo tracks to <audio>.
  useEffect(() => {
    const audio = audioRef.current;
    const track = currentRef.current;
    if (!audio) return;
    const stopAudio = () => {
      hasStreamRef.current = false;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
    const pauseYouTube = () => {
      pendingYtRef.current = null;
      try {
        ytRef.current?.pauseVideo();
      } catch {
        /* player not ready */
      }
    };
    setUnavailableReason(null);
    if (!track) {
      stopAudio();
      pauseYouTube();
      setStatus("idle");
      return;
    }
    setCurrentTime(0);
    setDuration(track.durationSec);
    const autoplay = autoplayRef.current;

    const ytId = youtubeIdOf(track);
    if (ytId) {
      stopAudio();
      setStatus(autoplay ? "loading" : "paused");
      const yt = ytRef.current;
      if (yt) {
        pendingYtRef.current = null;
        try {
          if (autoplay) yt.loadVideoById(ytId);
          else yt.cueVideoById(ytId);
        } catch {
          setStatus("error");
        }
      } else {
        // The embed mounts when the first YouTube track appears; it picks this up when ready.
        pendingYtRef.current = { id: ytId, autoplay };
      }
      return;
    }

    pauseYouTube();
    let cancelled = false;
    setStatus("loading");
    activeSource
      .resolveStream(track)
      .then((url) => {
        if (cancelled) return;
        if (!url) {
          stopAudio();
          setStatus("unavailable");
          setUnavailableReason("No audio for this demo track");
          if (autoplay) {
            toast("Audio unavailable", {
              description: `“${track.title}” is a metadata-only demo track. Search YouTube for real songs.`,
            });
          }
          return;
        }
        hasStreamRef.current = true;
        audio.src = url;
        audio.load();
        if (autoplay) audio.play().catch(() => setStatus("paused"));
        else setStatus("paused");
      })
      .catch(() => {
        if (cancelled) return;
        stopAudio();
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [loadId]);

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
    if (statusRef.current === "unavailable") {
      toast("Can't play this track", { description: reasonRef.current ?? track.title });
      return;
    }
    const ytId = youtubeIdOf(track);
    if (ytId) {
      const yt = ytRef.current;
      autoplayRef.current = true;
      if (!yt) {
        pendingYtRef.current = { id: ytId, autoplay: true };
        setStatus("loading");
        return;
      }
      try {
        const state = yt.getPlayerState();
        if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) yt.pauseVideo();
        else yt.playVideo();
      } catch {
        setStatus("error");
      }
      return;
    }
    if (!hasStreamRef.current) return;
    if (audio.paused) audio.play().catch(() => setStatus("paused"));
    else audio.pause();
  }, []);

  const pause = useCallback(() => {
    if (youtubeIdOf(currentRef.current)) {
      try {
        ytRef.current?.pauseVideo();
      } catch {
        /* not ready */
      }
    } else audioRef.current?.pause();
  }, []);

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
      if (youtubeIdOf(currentRef.current)) setStatus("paused");
      else {
        const audio = audioRef.current;
        if (audio && hasStreamRef.current) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
      return;
    }
    setIndex(ni);
    load(true);
  }, [queue.length, index, load]);
  nextRef.current = next;

  const position = useCallback(() => {
    if (youtubeIdOf(currentRef.current)) {
      try {
        return ytRef.current?.getCurrentTime() ?? 0;
      } catch {
        return 0;
      }
    }
    return audioRef.current?.currentTime ?? 0;
  }, []);

  const previous = useCallback(() => {
    const action = previousAction(index, position());
    if (action.kind === "restart") {
      if (youtubeIdOf(currentRef.current)) ytRef.current?.seekTo(0, true);
      else if (audioRef.current && hasStreamRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    setIndex(action.index);
    load(true);
  }, [index, load, position]);

  const seek = useCallback((seconds: number) => {
    if (youtubeIdOf(currentRef.current)) {
      ytRef.current?.seekTo(seconds, true);
      setCurrentTime(seconds);
      return;
    }
    const audio = audioRef.current;
    if (!audio || !hasStreamRef.current) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const applyYouTubeVolume = useCallback((yt: YouTubeController, v: number, m: boolean) => {
    try {
      yt.setVolume(Math.round(v * 100));
      if (m || v === 0) yt.mute();
      else yt.unMute();
    } catch {
      /* not ready */
    }
  }, []);

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.min(1, Math.max(0, v));
      const m = clamped === 0;
      setVolumeState(clamped);
      setMuted(m);
      if (audioRef.current) {
        audioRef.current.volume = clamped;
        audioRef.current.muted = m;
      }
      if (ytRef.current) applyYouTubeVolume(ytRef.current, clamped, m);
      try {
        window.localStorage.setItem(VOLUME_KEY, String(clamped));
      } catch {
        /* storage blocked: volume just won't persist */
      }
    },
    [applyYouTubeVolume],
  );

  const toggleMute = useCallback(() => {
    const m = !mutedRef.current;
    setMuted(m);
    if (audioRef.current) audioRef.current.muted = m;
    if (ytRef.current) applyYouTubeVolume(ytRef.current, volumeRef.current, m);
  }, [applyYouTubeVolume]);

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

  // ---- Official YouTube embed wiring ----

  const registerYouTube = useCallback(
    (player: YouTubeController | null) => {
      ytRef.current = player;
      setYtReady(!!player);
      if (!player) return;
      applyYouTubeVolume(player, volumeRef.current, mutedRef.current);
      const pending = pendingYtRef.current;
      if (pending && pending.id === youtubeIdOf(currentRef.current)) {
        pendingYtRef.current = null;
        try {
          if (pending.autoplay) player.loadVideoById(pending.id);
          else player.cueVideoById(pending.id);
        } catch {
          setStatus("error");
        }
      }
    },
    [applyYouTubeVolume],
  );

  const handleYouTubeState = useCallback(
    (state: number) => {
      if (!youtubeIdOf(currentRef.current) || statusRef.current === "unavailable") return;
      switch (state) {
        case YT_STATE.PLAYING:
          setStatus("playing");
          markPlayed();
          break;
        case YT_STATE.PAUSED:
        case YT_STATE.CUED:
          setStatus("paused");
          break;
        case YT_STATE.BUFFERING:
          setStatus("loading");
          break;
        case YT_STATE.ENDED:
          nextRef.current();
          break;
        default:
          break;
      }
    },
    [markPlayed],
  );

  const handleYouTubeError = useCallback((code: number) => {
    const track = currentRef.current;
    if (!youtubeIdOf(track)) return;
    const message = youtubeErrorMessage(code);
    setStatus("unavailable");
    setUnavailableReason(message);
    toast.error("This video can't play here", {
      description: message,
      ...(hasNextRef.current ? { action: { label: "Skip", onClick: () => nextRef.current() } } : {}),
    });
  }, []);

  // Poll position/duration from the embed while a YouTube track is loaded.
  useEffect(() => {
    if (!ytReady || !currentYouTubeId) return;
    const timer = window.setInterval(() => {
      const yt = ytRef.current;
      if (!yt) return;
      try {
        const t = yt.getCurrentTime();
        const d = yt.getDuration();
        if (Number.isFinite(t)) setCurrentTime(t);
        if (Number.isFinite(d) && d > 0) setDuration(d);
      } catch {
        /* player still initializing */
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [ytReady, currentYouTubeId]);

  // Space bar toggles playback when focus isn't in a text field or on a control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, button, iframe, [role=slider], [role=menuitem], [contenteditable=true]")) return;
      if (!currentRef.current) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  // OS media controls for demo audio (the YouTube embed manages its own).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !current || currentYouTubeId) return;
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
  }, [current, currentYouTubeId, togglePlay, previous]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      index,
      current,
      currentYouTubeId,
      status,
      unavailableReason,
      isPlaying: status === "playing" || (status === "loading" && autoplayRef.current),
      currentTime,
      duration,
      volume,
      muted,
      queueOpen,
      setQueueOpen,
      playTrack,
      playTracks,
      togglePlay,
      pause,
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
      registerYouTube,
      handleYouTubeState,
      handleYouTubeError,
    }),
    [
      queue, index, current, currentYouTubeId, status, unavailableReason, currentTime, duration, volume, muted,
      queueOpen, playTrack, playTracks, togglePlay, pause, next, previous, seek, setVolume, toggleMute,
      addToQueue, playNext, removeFromQueue, jumpTo, clearUpNext, registerYouTube, handleYouTubeState,
      handleYouTubeError,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
