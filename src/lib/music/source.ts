import { queryOptions } from "@tanstack/react-query";

import { demoSource } from "./demo-source";
import type { MusicSource } from "./types";

/**
 * The single active music source. Swap this for a lawful provider adapter
 * (implementing MusicSource) to power real catalog search and playback.
 * Provider credentials belong in server functions, never in this browser module.
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
