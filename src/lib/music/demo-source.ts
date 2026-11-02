import { ALBUMS, DEMO_AUDIO, DEMO_SOURCE_ID, GENRES, TRACKS } from "./demo-catalog";
import type { MusicSource, SearchResults } from "./types";

function matches(text: string, q: string) {
  return text.toLowerCase().includes(q);
}

/** The built-in sample catalog. Only tracks with an entry in DEMO_AUDIO have sound. */
export const demoSource: MusicSource = {
  id: DEMO_SOURCE_ID,
  name: "GHOST demo catalog",
  isDemo: true,
  description: "Fictional sample artists and albums with a few short original audio loops.",
  async getFeatured() {
    return { tracks: TRACKS.filter((t) => t.playable).concat(TRACKS.filter((t) => !t.playable).slice(0, 3)), albums: ALBUMS };
  },
  async getGenres() {
    return GENRES;
  },
  async getByGenre(genreId): Promise<SearchResults> {
    return {
      tracks: TRACKS.filter((t) => t.genre === genreId),
      albums: ALBUMS.filter((a) => a.genre === genreId),
    };
  },
  async search(query): Promise<SearchResults> {
    const q = query.trim().toLowerCase();
    if (!q) return { tracks: [], albums: [] };
    return {
      tracks: TRACKS.filter((t) => matches(t.title, q) || matches(t.artist, q) || matches(t.albumTitle, q)),
      albums: ALBUMS.filter((a) => matches(a.title, q) || matches(a.artist, q)),
    };
  },
  async getAlbum(albumId) {
    const album = ALBUMS.find((a) => a.id === albumId);
    if (!album) return null;
    return { album, tracks: album.trackIds.map((id) => TRACKS.find((t) => t.id === id)).filter((t): t is (typeof TRACKS)[number] => !!t) };
  },
  async resolveStream(track) {
    return DEMO_AUDIO[track.id] ?? null;
  },
};
