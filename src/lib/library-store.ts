import type { Track } from "./music/types";

export const HISTORY_LIMIT = 50;
export const STORAGE_KEY = "ghost-music:library:v1";

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  tracks: Track[];
}

export interface HistoryEntry {
  track: Track;
  playedAt: number;
}

export interface LibraryState {
  liked: Track[];
  playlists: Playlist[];
  history: HistoryEntry[];
}

export const emptyLibrary: LibraryState = { liked: [], playlists: [], history: [] };

export type LibraryAction =
  | { type: "hydrate"; state: LibraryState }
  | { type: "toggleLike"; track: Track }
  | { type: "createPlaylist"; id: string; name: string; now: number; track?: Track }
  | { type: "renamePlaylist"; id: string; name: string }
  | { type: "deletePlaylist"; id: string }
  | { type: "addToPlaylist"; id: string; track: Track }
  | { type: "removeFromPlaylist"; id: string; trackId: string }
  | { type: "recordPlay"; track: Track; now: number }
  | { type: "clearHistory" };

export function defaultPlaylistName(playlists: Playlist[]) {
  return `My Playlist #${playlists.length + 1}`;
}

export function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "toggleLike": {
      const isLiked = state.liked.some((t) => t.id === action.track.id);
      return {
        ...state,
        liked: isLiked
          ? state.liked.filter((t) => t.id !== action.track.id)
          : [action.track, ...state.liked],
      };
    }
    case "createPlaylist": {
      const name = action.name.trim() || defaultPlaylistName(state.playlists);
      const playlist: Playlist = {
        id: action.id,
        name,
        createdAt: action.now,
        tracks: action.track ? [action.track] : [],
      };
      return { ...state, playlists: [...state.playlists, playlist] };
    }
    case "renamePlaylist": {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        playlists: state.playlists.map((p) => (p.id === action.id ? { ...p, name } : p)),
      };
    }
    case "deletePlaylist":
      return { ...state, playlists: state.playlists.filter((p) => p.id !== action.id) };
    case "addToPlaylist":
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.id && !p.tracks.some((t) => t.id === action.track.id)
            ? { ...p, tracks: [...p.tracks, action.track] }
            : p,
        ),
      };
    case "removeFromPlaylist":
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.id ? { ...p, tracks: p.tracks.filter((t) => t.id !== action.trackId) } : p,
        ),
      };
    case "recordPlay": {
      const rest = state.history.filter((h) => h.track.id !== action.track.id);
      return {
        ...state,
        history: [{ track: action.track, playedAt: action.now }, ...rest].slice(0, HISTORY_LIMIT),
      };
    }
    case "clearHistory":
      return { ...state, history: [] };
  }
}

/** Validates data read from storage so a corrupted entry never crashes the app. */
export function parseStoredLibrary(raw: string | null): LibraryState {
  if (!raw) return emptyLibrary;
  try {
    const data = JSON.parse(raw) as Partial<LibraryState>;
    const isTrack = (t: unknown): t is Track =>
      !!t && typeof t === "object" && typeof (t as Track).id === "string" && typeof (t as Track).title === "string";
    return {
      liked: Array.isArray(data.liked) ? data.liked.filter(isTrack) : [],
      playlists: Array.isArray(data.playlists)
        ? data.playlists
            .filter((p) => p && typeof p.id === "string" && typeof p.name === "string")
            .map((p) => ({
              id: p.id,
              name: p.name,
              createdAt: typeof p.createdAt === "number" ? p.createdAt : 0,
              tracks: Array.isArray(p.tracks) ? p.tracks.filter(isTrack) : [],
            }))
        : [],
      history: Array.isArray(data.history)
        ? data.history
            .filter((h) => h && isTrack(h.track) && typeof h.playedAt === "number")
            .slice(0, HISTORY_LIMIT)
        : [],
    };
  } catch {
    return emptyLibrary;
  }
}

/** Storage can be blocked inside third-party iframes (e.g. Google Sites in some browsers). */
export function safeStorage() {
  try {
    const probe = "__ghost_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
