import type { MusicSource } from "./types";

/** No bundled sample catalog is exposed in the app. */
export const demoSource: MusicSource = {
  id: "ghost-empty",
  name: "GHOST Music",
  isDemo: false,
  description: "No local sample catalog is configured.",
  async getFeatured() { return { tracks: [], albums: [] }; },
  async getGenres() { return []; },
  async getByGenre() { return { tracks: [], albums: [] }; },
  async search() { return { tracks: [], albums: [] }; },
  async getAlbum() { return null; },
  async resolveStream() { return null; },
};
