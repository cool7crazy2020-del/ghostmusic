/**
 * The adapter boundary between the GHOST UI and any audio source.
 *
 * The UI only talks to a `MusicSource`. Today the app ships with a local demo
 * catalog. To add a lawful provider (a licensed streaming API, your own
 * royalty-free library, a self-hosted collection), implement this interface
 * and register it in `source.ts`. Never scrape sites or bypass DRM.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumId: string;
  albumTitle: string;
  /** Duration in seconds as reported by the source's metadata. */
  durationSec: number;
  /** Index into the artwork placeholder palette (`.art-N`). */
  art: number;
  genre: string;
  /**
   * Whether the source can provide playable audio for this track.
   * When false, the UI must show it as unavailable instead of pretending to play.
   */
  playable: boolean;
  /** Which source this track came from (used to label it in the UI). */
  sourceId: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  art: number;
  genre: string;
  description: string;
  trackIds: string[];
}

export interface Genre {
  id: string;
  name: string;
  art: number;
  blurb: string;
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
}

export interface MusicSource {
  id: string;
  name: string;
  /** True for sample/demo sources so the UI can label them clearly. */
  isDemo: boolean;
  description: string;
  getFeatured(): Promise<{ tracks: Track[]; albums: Album[] }>;
  getGenres(): Promise<Genre[]>;
  getByGenre(genreId: string): Promise<SearchResults>;
  search(query: string): Promise<SearchResults>;
  getAlbum(albumId: string): Promise<{ album: Album; tracks: Track[] } | null>;
  /**
   * Return a URL the browser can play with a standard <audio> element,
   * or null when no lawful stream is available for this track.
   */
  resolveStream(track: Track): Promise<string | null>;
}
