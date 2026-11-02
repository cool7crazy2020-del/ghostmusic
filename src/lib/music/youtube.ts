import type { Track } from "./types";

/**
 * Client-safe helpers for the official YouTube source.
 * Search runs on the server (YouTube Data API v3, see youtube.functions.ts);
 * playback runs through the official YouTube IFrame Player. Nothing here
 * downloads, extracts or proxies audio.
 */

export const YOUTUBE_SOURCE_ID = "youtube";

/** Plain data returned by the server for one YouTube video. */
export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string | null;
  thumbnail: string | null;
  durationSec: number;
  embeddable: boolean;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  subscriberCount: string | null;
}

export type YouTubeResult<T> =
  | ({ status: "ok" } & T)
  | { status: "not_configured" }
  | { status: "error"; message: string };

/** Parse an ISO 8601 duration such as "PT1H2M3S" into seconds. Returns 0 when unknown. */
export function parseIsoDuration(iso: string | null | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Math.round(
    Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0),
  );
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };

/** YouTube search snippets HTML-encode some characters; decode the common ones. */
export function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, k: string) => ENTITIES[k] ?? _);
}

/** Stable placeholder palette index derived from a string. */
function artIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 8;
}

export function videoToTrack(video: YouTubeVideo): Track {
  return {
    id: `yt-${video.id}`,
    title: video.title,
    artist: video.channelTitle,
    albumId: video.id,
    albumTitle: "YouTube",
    durationSec: video.durationSec,
    art: artIndex(video.id),
    genre: "youtube",
    playable: video.embeddable,
    sourceId: YOUTUBE_SOURCE_ID,
    sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
    youtubeId: video.id,
    channelId: video.channelId ?? undefined,
    thumbnail: video.thumbnail ?? undefined,
  };
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The YouTube video id for a track, or null for non-YouTube tracks.
 * Also understands tracks saved by older versions of the app (id "yt-…" or a watch URL).
 */
export function youtubeIdOf(track: Pick<Track, "id" | "youtubeId" | "sourceUrl"> | null | undefined): string | null {
  if (!track) return null;
  if (track.youtubeId && VIDEO_ID.test(track.youtubeId)) return track.youtubeId;
  if (track.sourceUrl) {
    try {
      const url = new URL(track.sourceUrl);
      if (/(^|\.)youtube\.com$/.test(url.hostname)) {
        const v = url.searchParams.get("v");
        if (v && VIDEO_ID.test(v)) return v;
      }
      if (url.hostname === "youtu.be") {
        const v = url.pathname.slice(1);
        if (VIDEO_ID.test(v)) return v;
      }
    } catch {
      /* not a URL */
    }
  }
  if (track.id.startsWith("yt-")) {
    const v = track.id.slice(3);
    if (VIDEO_ID.test(v)) return v;
  }
  return null;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

/** Human explanation for IFrame Player error codes (-1 = the player script failed to load). */
export function youtubeErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return "YouTube rejected this video link.";
    case 5:
      return "This video can't be played in this browser's YouTube player.";
    case 100:
      return "This video was removed or made private.";
    case 101:
    case 150:
    case 153:
      return "The owner doesn't allow this video to play outside YouTube (or it is age or region restricted). Open it on YouTube instead.";
    case -1:
      return "The YouTube player couldn't load. A content blocker or network issue may be stopping it.";
    default:
      return "YouTube couldn't play this video.";
  }
}
