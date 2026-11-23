import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Album metadata for Poster Studio from Apple's public iTunes Search API
 * (official, no key). YouTube Data API has no album concept, so it is not used here.
 */

export interface CatalogAlbumHit {
  id: string;
  title: string;
  artist: string;
  year?: number;
  artworkUrl?: string;
  trackCount?: number;
}

export interface CatalogAlbum extends CatalogAlbumHit {
  tracks: Array<{ disc: number; number: number; title: string; durationSec?: number }>;
  discCount: number;
}

const bigArt = (u?: string) => (u ? u.replace(/\/\d+x\d+bb\./, "/1500x1500bb.") : undefined);
const yearOf = (d?: string) => {
  const y = d ? new Date(d).getUTCFullYear() : NaN;
  return Number.isFinite(y) ? y : undefined;
};

async function itunes(path: string) {
  const res = await fetch(`https://itunes.apple.com/${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Album catalog request failed (${res.status}).`);
  return (await res.json()) as { results: any[] };
}

export const searchCatalogAlbums = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => z.object({ q: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ data }): Promise<CatalogAlbumHit[]> => {
    const json = await itunes(`search?entity=album&limit=24&term=${encodeURIComponent(data.q)}`);
    return json.results
      .filter((r) => r.wrapperType === "collection" && r.collectionId)
      .map((r) => ({
        id: String(r.collectionId),
        title: r.collectionName ?? "Untitled",
        artist: r.artistName ?? "",
        year: yearOf(r.releaseDate),
        artworkUrl: bigArt(r.artworkUrl100),
        trackCount: r.trackCount,
      }));
  });

export const getCatalogAlbum = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().regex(/^(\d+|deezer:\d+)$/) }).parse(d))
  .handler(async ({ data }): Promise<CatalogAlbum | null> => {
    if (data.id.startsWith("deezer:")) {
      const albumId = data.id.slice("deezer:".length);
      if (!/^\\d+$/.test(albumId)) throw new Error("Invalid album selection.");
      const response = await fetch(`https://api.deezer.com/album/${albumId}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Album details unavailable (${response.status}).`);
      const item = await response.json() as any;
      if (item.error) throw new Error(item.error.message ?? "Album details unavailable.");
      const tracks = (item.tracks?.data ?? []).map((track: any) => ({
        disc: track.disk_number ?? 1,
        number: track.track_position ?? 0,
        title: track.title ?? "",
        durationSec: track.duration || undefined,
      })).sort((a: any, b: any) => a.disc - b.disc || a.number - b.number);
      return {
        id: data.id,
        title: item.title ?? "Untitled",
        artist: item.artist?.name ?? "",
        year: yearOf(item.release_date),
        artworkUrl: item.cover_xl ?? item.cover_big ?? item.cover_medium,
        trackCount: item.nb_tracks ?? tracks.length,
        discCount: Math.max(1, item.nb_disk ?? 1, ...tracks.map((t: any) => t.disc)),
        tracks,
      };
    }

    const json = await itunes(`lookup?entity=song&limit=200&id=${data.id}`);
    const c = json.results.find((r) => r.wrapperType === "collection");
    if (!c) return null;
    const tracks = json.results
      .filter((r) => r.wrapperType === "track" && r.kind === "song")
      .map((r) => ({
        disc: r.discNumber ?? 1,
        number: r.trackNumber ?? 0,
        title: r.trackName ?? "",
        durationSec: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : undefined,
      }))
      .sort((a, b) => a.disc - b.disc || a.number - b.number);
    return {
      id: data.id,
      title: c.collectionName ?? "Untitled",
      artist: c.artistName ?? "",
      year: yearOf(c.releaseDate),
      artworkUrl: bigArt(c.artworkUrl100),
      trackCount: c.trackCount,
      discCount: Math.max(1, c.discCount ?? 1, ...tracks.map((t) => t.disc)),
      tracks,
    };
  });

/** Fetch returned artwork server-side so the browser can draw it into an exportable canvas. */
export const fetchArtworkDataUrl = createServerFn({ method: "GET" })
  .inputValidator((d: { url: string }) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const u = new URL(data.url);
    if (u.protocol !== "https:" || !/(^|\.)mzstatic\.com$/.test(u.hostname)) throw new Error("Artwork host not allowed.");
    const res = await fetch(u);
    if (!res.ok) throw new Error(`Artwork unavailable (${res.status}).`);
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:${type};base64,${btoa(bin)}`;
  });
