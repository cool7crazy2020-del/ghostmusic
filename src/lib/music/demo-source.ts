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
    if (!track.sourceUrl) return null;
    try {
      const response = await fetch(AUDIO_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: track.sourceUrl }),
      });
      if (!response.ok) return null;
      const result = (await response.json()) as { url?: unknown };
      return typeof result.url === "string" && result.url.startsWith("https://")
        ? result.url
        : null;
    } catch {
      return null;
    }
  },
};
