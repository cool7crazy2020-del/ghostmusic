import { ALBUMS, DEMO_AUDIO, DEMO_SOURCE_ID, GENRES, TRACKS } from "./demo-catalog";
import type { MusicSource, SearchResults } from "./types";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Searches the local demo catalog only. It does not search any real music service. */
export function searchDemoCatalog(query: string): SearchResults {
  const q = normalize(query);
  if (!q) return { tracks: [], albums: [] };
  const terms = q.split(/\s+/);
  const matches = (fields: string[]) => {
    const hay = normalize(fields.join(" "));
    return terms.every((term) => hay.includes(term));
  };
  return {
    tracks: TRACKS.filter((t) => matches([t.title, t.artist, t.albumTitle, t.genre])),
    albums: ALBUMS.filter((a) => matches([a.title, a.artist, a.genre])),
  };
}

export const demoSource: MusicSource = {
  id: DEMO_SOURCE_ID,
  name: "GHOST Demo Catalog",
  isDemo: true,
  description:
    "Fictional sample tracks. A few have short synthesized audio loops made for this app; the rest are metadata only.",

  async getFeatured() {
    const playableFirst = [...TRACKS].sort((a, b) => Number(b.playable) - Number(a.playable));
    return { tracks: playableFirst.slice(0, 8), albums: ALBUMS };
  },

  async getGenres() {
    return GENRES;
  },

  async getByGenre(genreId) {
    return {
      tracks: TRACKS.filter((t) => t.genre === genreId),
      albums: ALBUMS.filter((a) => a.genre === genreId),
    };
  },

  async search(query) {
    return searchDemoCatalog(query);
  },

  async getAlbum(albumId) {
    const album = ALBUMS.find((a) => a.id === albumId);
    if (!album) return null;
    return { album, tracks: TRACKS.filter((t) => t.albumId === albumId) };
  },

  async resolveStream(track) {
    if (track.sourceId !== DEMO_SOURCE_ID) return null;
    return DEMO_AUDIO[track.id] ?? null;
  },
};
