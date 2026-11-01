import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, useRef, type ReactNode } from "react";
import { toast } from "sonner";

import {
  emptyLibrary,
  libraryReducer,
  parseStoredLibrary,
  safeStorage,
  STORAGE_KEY,
  type LibraryState,
} from "@/lib/library-store";
import type { Track } from "@/lib/music/types";
import { cloudRequest, getSession } from "@/lib/ghost-auth";

interface LibraryContextValue extends LibraryState {
  /** False until saved data has been read on the client (avoids flashing empty states). */
  ready: boolean;
  /** False when the browser blocks storage (common for embedded iframes in strict browsers). */
  storageAvailable: boolean;
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => void;
  createPlaylist: (name: string, track?: Track) => string;
  renamePlaylist: (id: string, name: string) => void;
  setPlaylistImage: (id: string, image: string | null) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, track: Track) => void;
  removeFromPlaylist: (id: string, trackId: string) => void;
  recordPlay: (track: Track) => void;
  clearHistory: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(libraryReducer, emptyLibrary);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const cloudReadyForUser = useRef<string | null>(null);
  const lastCloudPayload = useRef("");

  useEffect(() => {
    const storage = safeStorage();
    setStorageAvailable(!!storage);
    if (storage) dispatch({ type: "hydrate", state: parseStoredLibrary(storage.getItem(STORAGE_KEY)) });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !storageAvailable) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageAvailable(false);
    }
  }, [state, ready, storageAvailable]);

  useEffect(() => {
    let cancelled = false;
    const loadCloud = async (userId: string | null) => {
      cloudReadyForUser.current = null;
      setCloudUserId(userId);
      if (!userId) return;
      try {
        const response = await cloudRequest(`ghost_libraries?select=library&user_id=eq.${encodeURIComponent(userId)}`, "GET");
        if (!response || cancelled) return;
        const rows = await response.json() as { library?: LibraryState }[];
        if (cancelled) return;
        if (rows[0]?.library && typeof rows[0].library === "object") {
          const restored = parseStoredLibrary(JSON.stringify(rows[0].library));
          dispatch({ type: "hydrate", state: restored });
          lastCloudPayload.current = JSON.stringify(restored);
        } else {
          const localState = parseStoredLibrary(safeStorage()?.getItem(STORAGE_KEY) ?? null);
          const payload = JSON.stringify(localState);
          await cloudRequest("ghost_libraries?on_conflict=user_id", "POST", { user_id: userId, library: localState, updated_at: new Date().toISOString() });
          lastCloudPayload.current = payload;
        }
        cloudReadyForUser.current = userId;
      } catch (error) {
        console.error("GHOST cloud library load failed", error);
        cloudReadyForUser.current = userId;
        toast.error("Cloud sync unavailable", { description: error instanceof Error ? error.message : "Your local library is still available." });
      }
    };
    const handleAuth = (event?: Event) => {
      const session = event ? (event as CustomEvent).detail : getSession();
      void loadCloud(session?.user?.id ?? null);
    };
    handleAuth();
    window.addEventListener("ghost-auth-change", handleAuth);
    return () => { cancelled = true; window.removeEventListener("ghost-auth-change", handleAuth); };
  }, []);

  useEffect(() => {
    if (!ready || !cloudUserId || cloudReadyForUser.current !== cloudUserId) return;
    const payload = JSON.stringify(state);
    if (payload === lastCloudPayload.current) return;
    const timer = window.setTimeout(async () => {
      try {
        await cloudRequest("ghost_libraries?on_conflict=user_id", "POST", { user_id: cloudUserId, library: state, updated_at: new Date().toISOString() });
        lastCloudPayload.current = payload;
      } catch (error) {
        console.error("GHOST cloud library save failed", error);
        toast.error("Couldn't save to your account", { description: "Your changes remain saved in this browser. Check your connection and Supabase setup." });
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, ready, cloudUserId]);

  const isLiked = useCallback((id: string) => state.liked.some((t) => t.id === id), [state.liked]);

  const toggleLike = useCallback(
    (track: Track) => {
      const wasLiked = state.liked.some((t) => t.id === track.id);
      dispatch({ type: "toggleLike", track });
      toast(wasLiked ? "Removed from Liked Songs" : "Added to Liked Songs", { description: track.title });
    },
    [state.liked],
  );

  const createPlaylist = useCallback((name: string, track?: Track) => {
    const id = newId();
    dispatch({ type: "createPlaylist", id, name, now: Date.now(), track });
    return id;
  }, []);

  const addToPlaylist = useCallback(
    (id: string, track: Track) => {
      const playlist = state.playlists.find((p) => p.id === id);
      if (!playlist) return;
      if (playlist.tracks.some((t) => t.id === track.id)) {
        toast("Already in this playlist", { description: playlist.name });
        return;
      }
      dispatch({ type: "addToPlaylist", id, track });
      toast(`Added to ${playlist.name}`, { description: track.title });
    },
    [state.playlists],
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      ...state,
      ready,
      storageAvailable,
      isLiked,
      toggleLike,
      createPlaylist,
      renamePlaylist: (id, name) => dispatch({ type: "renamePlaylist", id, name }),
      setPlaylistImage: (id, image) => dispatch({ type: "setPlaylistImage", id, image }),
      deletePlaylist: (id) => dispatch({ type: "deletePlaylist", id }),
      addToPlaylist,
      removeFromPlaylist: (id, trackId) => dispatch({ type: "removeFromPlaylist", id, trackId }),
      recordPlay: (track) => dispatch({ type: "recordPlay", track, now: Date.now() }),
      clearHistory: () => dispatch({ type: "clearHistory" }),
    }),
    [state, ready, storageAvailable, isLiked, toggleLike, createPlaylist, addToPlaylist],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}
