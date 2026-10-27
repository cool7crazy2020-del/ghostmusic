import type { Album, Genre, Track } from "./types";

/**
 * GHOST demo catalog.
 *
 * Every artist, album and track here is fictional sample data. Only tracks with an
 * entry in DEMO_AUDIO have real audio: short synthesized loops created for this app
 * and served from /public/audio. All other tracks are metadata-only and show as
 * "unavailable" in the player.
 */

export const DEMO_SOURCE_ID = "ghost-demo";

export const DEMO_AUDIO: Record<string, string> = {
  "t-midnight-signal": "/audio/midnight-signal.mp3",
  "t-violet-hours": "/audio/violet-hours.mp3",
  "t-phantom-drive": "/audio/phantom-drive.mp3",
  "t-glasswire": "/audio/glasswire.mp3",
  "t-low-orbit": "/audio/low-orbit.mp3",
};

export const GENRES: Genre[] = [
  { id: "ambient", name: "Ambient", art: 2, blurb: "Slow drift, long tails" },
  { id: "synthwave", name: "Synthwave", art: 1, blurb: "Chrome, neon, night roads" },
  { id: "electronic", name: "Electronic", art: 5, blurb: "Pulses and patterns" },
  { id: "downtempo", name: "Downtempo", art: 3, blurb: "Low light, unhurried" },
  { id: "lofi", name: "Lo-fi", art: 4, blurb: "Warm, dusty, close" },
];

type RawAlbum = Omit<Album, "trackIds"> & {
  tracks: Array<{ id: string; title: string; durationSec: number }>;
};

const RAW: RawAlbum[] = [
  {
    id: "afterglow-frequencies",
    title: "Afterglow Frequencies",
    artist: "Nocturne Static",
    year: 2025,
    art: 0,
    genre: "ambient",
    description: "Late-night pads and soft arpeggios.",
    tracks: [
      { id: "t-midnight-signal", title: "Midnight Signal", durationSec: 40 },
      { id: "t-violet-hours", title: "Violet Hours", durationSec: 40 },
      { id: "t-neon-rain", title: "Neon Rain", durationSec: 214 },
      { id: "t-static-bloom", title: "Static Bloom", durationSec: 198 },
    ],
  },
  {
    id: "phantom-drive",
    title: "Phantom Drive",
    artist: "Hollow Arcade",
    year: 2024,
    art: 1,
    genre: "synthwave",
    description: "Bass pulses for empty highways.",
    tracks: [
      { id: "t-phantom-drive", title: "Phantom Drive", durationSec: 40 },
      { id: "t-chrome-heart", title: "Chrome Heart", durationSec: 231 },
      { id: "t-overpass", title: "Overpass", durationSec: 187 },
    ],
  },
  {
    id: "glass-garden",
    title: "Glass Garden",
    artist: "Vela Moon",
    year: 2026,
    art: 2,
    genre: "electronic",
    description: "Bright plucks over quiet chords.",
    tracks: [
      { id: "t-glasswire", title: "Glasswire", durationSec: 40 },
      { id: "t-paper-satellites", title: "Paper Satellites", durationSec: 205 },
      { id: "t-soft-machinery", title: "Soft Machinery", durationSec: 243 },
    ],
  },
  {
    id: "low-orbit",
    title: "Low Orbit",
    artist: "Saint Lumen",
    year: 2025,
    art: 3,
    genre: "downtempo",
    description: "A slow drone that never quite lands.",
    tracks: [
      { id: "t-low-orbit", title: "Low Orbit", durationSec: 40 },
      { id: "t-weightless", title: "Weightless", durationSec: 262 },
      { id: "t-dark-side-radio", title: "Dark Side Radio", durationSec: 219 },
    ],
  },
  {
    id: "echo-chamber",
    title: "Echo Chamber",
    artist: "Mira Kade",
    year: 2023,
    art: 4,
    genre: "lofi",
    description: "Tape hiss and late trains.",
    tracks: [
      { id: "t-echo-chamber", title: "Echo Chamber", durationSec: 176 },
      { id: "t-halcyon", title: "Halcyon", durationSec: 201 },
      { id: "t-night-bus", title: "Night Bus", durationSec: 189 },
    ],
  },
  {
    id: "ultraviolet-tapes",
    title: "Ultraviolet Tapes",
    artist: "Ghost Collective",
    year: 2026,
    art: 5,
    genre: "electronic",
    description: "Unreleased sketches from the vault.",
    tracks: [
      { id: "t-wraith", title: "Wraith", durationSec: 222 },
      { id: "t-afterimage", title: "Afterimage", durationSec: 195 },
    ],
  },
];

export const ALBUMS: Album[] = RAW.map(({ tracks, ...album }) => ({
  ...album,
  trackIds: tracks.map((t) => t.id),
}));

export const TRACKS: Track[] = RAW.flatMap((album) =>
  album.tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artist: album.artist,
    albumId: album.id,
    albumTitle: album.title,
    durationSec: t.durationSec,
    art: album.art,
    genre: album.genre,
    playable: t.id in DEMO_AUDIO,
    sourceId: DEMO_SOURCE_ID,
  })),
);
