import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  decodeEntities,
  parseIsoDuration,
  type YouTubeChannel,
  type YouTubeResult,
  type YouTubeVideo,
} from "./youtube";

/**
 * Official YouTube Data API v3 calls. The API key is read from the server
 * environment (YOUTUBE_API_KEY) inside each handler and never reaches the browser.
 *
 * Quota (default 10,000 units/day): search = 100 units, videos/channels/playlistItems = 1 unit.
 */

const API = "https://www.googleapis.com/youtube/v3";

type Thumbs = Partial<Record<"maxres" | "standard" | "high" | "medium" | "default", { url: string }>>;

interface ApiVideo {
  id: string;
  snippet?: { title?: string; channelTitle?: string; channelId?: string; thumbnails?: Thumbs };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
}

class YouTubeApiError extends Error {}

function pickThumb(t: Thumbs | undefined): string | null {
  return t?.high?.url ?? t?.medium?.url ?? t?.standard?.url ?? t?.default?.url ?? null;
}

function friendlyError(status: number, body: unknown): string {
  const err = (body as { error?: { message?: string; errors?: { reason?: string }[]; details?: { reason?: string }[] } })?.error;
  const reasons = [
    ...(err?.errors ?? []).map((e) => e.reason ?? ""),
    ...(err?.details ?? []).map((d) => d.reason ?? ""),
  ].join(" ");
  const text = `${reasons} ${err?.message ?? ""}`;
  if (/quotaExceeded|dailyLimitExceeded|rateLimitExceeded/i.test(text))
    return "Today's YouTube search quota is used up. It resets at midnight Pacific Time.";
  if (/API_KEY_INVALID|keyInvalid|API key not valid/i.test(text))
    return "The YouTube API key isn't valid. Check the YOUTUBE_API_KEY secret.";
  if (/REFERRER|referer|IP_ADDRESS|ipRefererBlocked/i.test(text))
    return "The YouTube API key has website (HTTP referrer) restrictions that block server requests. Set its application restriction to None and restrict it to YouTube Data API v3 instead.";
  if (/accessNotConfigured|SERVICE_DISABLED|has not been used|disabled/i.test(text))
    return "YouTube Data API v3 isn't enabled in the Google Cloud project for this key.";
  if (status === 403) return "YouTube refused the request. Check the API key's restrictions.";
  return "YouTube search failed. Please try again.";
}

async function ytGet<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const url = new URL(`${API}/${path}`);
  url.search = new URLSearchParams({ ...params, key }).toString();
  let response: Response;
  try {
    response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  } catch {
    throw new YouTubeApiError("Couldn't reach YouTube. Please try again.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("YouTube API error", response.status, JSON.stringify(body));
    throw new YouTubeApiError(friendlyError(response.status, body));
  }
  return body as T;
}

function toVideo(v: ApiVideo): YouTubeVideo | null {
  if (!v.id || !v.snippet?.title) return null;
  if (v.status?.privacyStatus && v.status.privacyStatus === "private") return null;
  return {
    id: v.id,
    title: decodeEntities(v.snippet.title),
    channelTitle: decodeEntities(v.snippet.channelTitle ?? "YouTube"),
    channelId: v.snippet.channelId ?? null,
    thumbnail: pickThumb(v.snippet.thumbnails),
    durationSec: parseIsoDuration(v.contentDetails?.duration),
    embeddable: v.status?.embeddable !== false,
  };
}

/** Full details (duration, embeddable) for up to 50 ids, returned in the given order. */
async function videoDetails(ids: string[], key: string): Promise<YouTubeVideo[]> {
  if (ids.length === 0) return [];
  const data = await ytGet<{ items?: ApiVideo[] }>(
    "videos",
    { part: "snippet,contentDetails,status", id: ids.slice(0, 50).join(","), maxResults: "50" },
    key,
  );
  const byId = new Map((data.items ?? []).map((v) => [v.id, v]));
  return ids
    .map((id) => byId.get(id))
    .filter((v): v is ApiVideo => !!v)
    .map(toVideo)
    .filter((v): v is YouTubeVideo => !!v);
}

function readKey(): string | null {
  const key = process.env["YOUTUBE_API_KEY"]?.trim();
  return key ? key : null;
}

function asError(error: unknown): { status: "error"; message: string } {
  if (error instanceof YouTubeApiError) return { status: "error", message: error.message };
  console.error("YouTube request failed", error);
  return { status: "error", message: "YouTube search failed. Please try again." };
}

/** Whether a YouTube API key is configured. Costs no quota. */
export const getYouTubeStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { configured: readKey() !== null };
});

export const searchYouTube = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().trim().min(1).max(200),
        limit: z.number().int().min(1).max(25).optional(),
        pageToken: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<YouTubeResult<{ videos: YouTubeVideo[]; nextPageToken: string | null }>> => {
    const key = readKey();
    if (!key) return { status: "not_configured" };
    try {
      const params: Record<string, string> = {
        part: "snippet",
        type: "video",
        videoCategoryId: "10",
        videoEmbeddable: "true",
        maxResults: String(data.limit ?? 20),
        q: data.q,
      };
      if (data.pageToken) params["pageToken"] = data.pageToken;
      const search = await ytGet<{ items?: { id?: { videoId?: string } }[]; nextPageToken?: string }>(
        "search",
        params,
        key,
      );
      const ids = (search.items ?? []).map((i) => i.id?.videoId).filter((id): id is string => !!id);
      const videos = await videoDetails(ids, key);
      return { status: "ok", videos, nextPageToken: search.nextPageToken ?? null };
    } catch (error) {
      return asError(error);
    }
  });

/** Most popular music videos (1 quota unit). */
export const getYouTubeTrending = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ regionCode: z.string().regex(/^[A-Z]{2}$/).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<YouTubeResult<{ videos: YouTubeVideo[] }>> => {
    const key = readKey();
    if (!key) return { status: "not_configured" };
    try {
      const res = await ytGet<{ items?: ApiVideo[] }>(
        "videos",
        {
          part: "snippet,contentDetails,status",
          chart: "mostPopular",
          videoCategoryId: "10",
          regionCode: data.regionCode ?? "US",
          maxResults: "20",
        },
        key,
      );
      const videos = (res.items ?? []).map(toVideo).filter((v): v is YouTubeVideo => !!v && v.embeddable);
      return { status: "ok", videos };
    } catch (error) {
      return asError(error);
    }
  });

/** Channel profile plus its latest uploads (about 3 quota units). */
export const getYouTubeChannel = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ channelId: z.string().regex(/^[A-Za-z0-9_-]{10,40}$/) }).parse(input),
  )
  .handler(async ({ data }): Promise<YouTubeResult<{ channel: YouTubeChannel; videos: YouTubeVideo[] }> | { status: "not_found" }> => {
    const key = readKey();
    if (!key) return { status: "not_configured" };
    try {
      const res = await ytGet<{
        items?: {
          id: string;
          snippet?: { title?: string; description?: string; thumbnails?: Thumbs };
          contentDetails?: { relatedPlaylists?: { uploads?: string } };
          statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
        }[];
      }>("channels", { part: "snippet,contentDetails,statistics", id: data.channelId }, key);
      const ch = res.items?.[0];
      if (!ch) return { status: "not_found" };
      const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
      let videos: YouTubeVideo[] = [];
      if (uploads) {
        const items = await ytGet<{ items?: { contentDetails?: { videoId?: string } }[] }>(
          "playlistItems",
          { part: "contentDetails", playlistId: uploads, maxResults: "25" },
          key,
        );
        const ids = (items.items ?? []).map((i) => i.contentDetails?.videoId).filter((id): id is string => !!id);
        videos = await videoDetails(ids, key);
      }
      const subs = ch.statistics?.hiddenSubscriberCount ? null : (ch.statistics?.subscriberCount ?? null);
      return {
        status: "ok",
        channel: {
          id: ch.id,
          title: decodeEntities(ch.snippet?.title ?? "YouTube channel"),
          description: ch.snippet?.description ?? "",
          thumbnail: pickThumb(ch.snippet?.thumbnails),
          subscriberCount: subs,
        },
        videos,
      };
    } catch (error) {
      return asError(error);
    }
  });
