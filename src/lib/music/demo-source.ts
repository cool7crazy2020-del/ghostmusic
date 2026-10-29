import type { MusicSource } from "./types";

const AUDIO_API = "https://ghostmusic-s8vd.onrender.com/api/resolve-audio";

/** Provider adapter for the existing backend audio resolver. */
export const demoSource: MusicSource = {
  id: "ghost-audio",
  name: "GHOST Music",
  isDemo: false,
  description: "Search and playback through the configured audio backend.",
  async getFeatured() { return { tracks: [], albums: [] }; },
  async getGenres() { return []; },
  async getByGenre() { return { tracks: [], albums: [] }; },
  async search() { return { tracks: [], albums: [] }; },
  async getAlbum() { return null; },
  async resolveStream(track) {
    if (!track.sourceUrl) {
      throw new Error("This track has no source URL attached.");
    }

    let response: Response;
    try {
      response = await fetch(AUDIO_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: track.sourceUrl }),
      });
    } catch {
      throw new Error("Could not reach the GHOST audio backend. Check whether the Render service is awake.");
    }

    const result = (await response.json().catch(() => ({}))) as {
      url?: unknown;
      error?: unknown;
    };

    if (!response.ok) {
      const message = typeof result.error === "string" ? result.error : `Audio backend returned HTTP ${response.status}.`;
      throw new Error(message);
    }

    if (typeof result.url !== "string" || !result.url.startsWith("https://")) {
      throw new Error("The backend responded but did not return a playable HTTPS audio URL.");
    }

    return result.url;
  },
};
