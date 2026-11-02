import { queryOptions } from "@tanstack/react-query";

import { demoSource } from "./demo-source";
import type { MusicSource } from "./types";
import { getYouTubeChannel, getYouTubeStatus, getYouTubeTrending, searchYouTube } from "./youtube.functions";

/**
 * The built-in demo catalog (albums, genres, sample audio). YouTube search and
 * playback live alongside it via the server functions in youtube.functions.ts.
 */
export const activeSource: MusicSource = demoSource;

export const featuredQuery = () =>
  queryOptions({
    queryKey: ["source", activeSource.id, "featured"],
    queryFn: () => activeSource.getFeatured(),
    staleTime: Infinity,
  });

export const genresQuery = () =>
  queryOptions({
    queryKey: ["source", activeSource.id, "genres"],
    queryFn: () => activeSource.getGenres(),
    staleTime: Infinity,
  });

export const genreQuery = (genreId: string) =>
  queryOptions({
    queryKey: ["source", activeSource.id, "genre", genreId],
    queryFn: () => activeSource.getByGenre(genreId),
    staleTime: Infinity,
  });

export const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ["source", activeSource.id, "search", q],
    queryFn: () => activeSource.search(q),
    staleTime: 60_000,
  });

export const albumQuery = (albumId: string) =>
  queryOptions({
    queryKey: ["source", activeSource.id, "album", albumId],
    queryFn: () => activeSource.getAlbum(albumId),
    staleTime: Infinity,
  });

// ---- YouTube (official Data API v3, called through the server) ----
// Each search costs 100 of the daily 10,000 quota units, so results are cached generously.

export const youtubeStatusQuery = () =>
  queryOptions({
    queryKey: ["youtube", "status"],
    queryFn: () => getYouTubeStatus(),
    staleTime: 5 * 60_000,
  });

export const youtubeSearchQuery = (q: string) =>
  queryOptions({
    queryKey: ["youtube", "search", q.toLowerCase()],
    queryFn: () => searchYouTube({ data: { q } }),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
  });

export const youtubeTrendingQuery = () =>
  queryOptions({
    queryKey: ["youtube", "trending"],
    queryFn: () => getYouTubeTrending({ data: {} }),
    staleTime: 30 * 60_000,
    retry: false,
  });

export const youtubeChannelQuery = (channelId: string) =>
  queryOptions({
    queryKey: ["youtube", "channel", channelId],
    queryFn: () => getYouTubeChannel({ data: { channelId } }),
    staleTime: 30 * 60_000,
    retry: false,
  });
