import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
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

interface LibraryContextValue extends LibraryState {
  /** False until saved data has been read on the client (avoids flashing empty states). */
  ready: boolean;
  /** False when the browser blocks storage (common for embedded iframes in strict browsers). */
  storageAvailable: boolean;
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => void;
  createPlaylist: (name: string, track?: Track) => string;
  renamePlaylist: (id: string, name: string) => void;
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
