import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Music2, Play, SearchX } from "lucide-react";
import { useState } from "react";

import { EmptyState, Page, Section } from "@/components/ghost/page-parts";
import { LikeButton } from "@/components/ghost/LikeButton";
import { TrackActionsMenu } from "@/components/ghost/TrackActionsMenu";
import type { Track } from "@/lib/music/types";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/components/ghost/player-context";

type SearchParams = { q?: string };
type ResultTab = "all" | "songs" | "artists" | "albums";

type ArtistResult = {
  id: string;
  name: string;
  thumbnail: string | null;
  subscribers?: string | null;
};

type AlbumResult = {
  id: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  year?: string | number | null;
  type?: string | null;
};

type SongResult = {
  videoId: string;
  title: string;
  artist: string;
  artists?: { id?: string; name: string }[];
  thumbnail: string | null;
  duration?: string | null;
  album?: string | null;
};

type SearchResponse = {
  results?: SongResult[];
  artists?: ArtistResult[];
  albums?: AlbumResult[];
  error?: string;
};

const SEARCH_API = "https://ghostmusic-s8vd.onrender.com/api/search";
function toLibraryTrack(song: SongResult): Track {
  const duration = song.duration?.split(":").reduce((total, part) => total * 60 + Number(part), 0) ?? 0;
  return { id: `yt-${song.videoId}`, title: song.title, artist: song.artist, albumId: song.videoId, albumTitle: song.album ?? "Unknown album", durationSec: Number.isFinite(duration) ? duration : 0, art: 0, genre: "unknown", playable: true, sourceId: "youtube-audio", sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(song.videoId)}` };
}

const tabs: { id: ResultTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "songs", label: "Songs" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
];

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search — GHOST Music" },
      { name: "description", content: "Discover songs, artists, and albums on GHOST Music." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const query = q?.trim() ?? "";
  const [activeTab, setActiveTab] = useState<ResultTab>("all");
  const { playTrack } = usePlayer();

  const { data, isFetching, isError } = useQuery({
    queryKey: ["ghost-search", query],
    queryFn: async (): Promise<SearchResponse> => {
      const response = await fetch(`${SEARCH_API}?q=${encodeURIComponent(query)}`);
      let result: SearchResponse;
      try {
        result = (await response.json()) as SearchResponse;
      } catch {
        throw new Error("The search service returned an invalid response.");
      }
      if (!response.ok) throw new Error(result.error ?? "Music search failed.");
      return result;
    },
    enabled: query.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  const songs = data?.results ?? [];
  const artists = data?.artists ?? [];
  const albums = data?.albums ?? [];

  return (
    <Page>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            {query ? `Search results for “${query}”` : "Search"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find songs, artists, albums, and your next obsession.
          </p>
        </div>
        {query && (
          <div className="flex flex-wrap justify-end gap-2" role="tablist" aria-label="Search result type">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-glow-sm" : "bg-surface-raised text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!query ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-8">
          <h2 className="text-xl font-bold">What are you in the mood for?</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Search for a song, artist, or album to explore the music you love.
          </p>
        </div>
      ) : isFetching ? (
        <p className="mt-8 text-sm text-muted-foreground">Searching…</p>
      ) : isError ? (
        <div className="mt-10">
          <EmptyState icon={<SearchX />} title="Search failed">
            We couldn&apos;t load results. Please try again.
          </EmptyState>
        </div>
      ) : (
        <>
          {(activeTab === "all" || activeTab === "artists") && artists.length > 0 && (
            <Section title="Artists">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {artists.map((artist) => (
                  <Link
                    key={artist.id}
                    to="/artist/$artistId"
                    params={{ artistId: artist.id }}
                    className="group min-w-0 rounded-xl p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {artist.thumbnail ? (
                      <img src={artist.thumbnail} alt="" loading="lazy" className="mx-auto aspect-square w-full max-w-40 rounded-full object-cover shadow-lg transition-transform group-hover:scale-[1.03]" />
                    ) : (
                      <div className="mx-auto flex aspect-square w-full max-w-40 items-center justify-center rounded-full bg-muted"><Music2 size={36} /></div>
                    )}
                    <h2 className="mt-3 truncate text-center font-semibold">{artist.name}</h2>
                    <p className="mt-1 text-center text-xs text-muted-foreground">Artist</p>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {(activeTab === "all" || activeTab === "albums") && albums.length > 0 && (
            <Section title="Albums">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {albums.map((album) => (
                  <a
                    key={album.id}
                    href={`https://music.youtube.com/browse/${encodeURIComponent(album.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group min-w-0 rounded-xl p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {album.thumbnail ? (
                      <img src={album.thumbnail} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover shadow-md transition-transform group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted"><Music2 size={32} /></div>
                    )}
                    <h2 className="mt-3 truncate text-sm font-semibold">{album.title}</h2>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{album.artist}{album.year ? ` · ${album.year}` : ""}</p>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {(activeTab === "all" || activeTab === "songs") && songs.length > 0 && (
            <Section title="Songs">
              <div className="divide-y divide-border/70">
                {songs.map((song, index) => {
                  const primaryArtist = song.artists?.[0];
                  return (
                    <div key={song.videoId || `${song.title}-${index}`} className="group flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-accent">
                      {song.thumbnail ? (
                        <img src={song.thumbnail} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted"><Music2 size={18} /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <a href={`https://music.youtube.com/watch?v=${encodeURIComponent(song.videoId)}`} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium hover:text-primary">{song.title}</a>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {primaryArtist?.id ? (
                            <Link to="/artist/$artistId" params={{ artistId: primaryArtist.id }} className="hover:text-foreground hover:underline">{primaryArtist.name}</Link>
                          ) : song.artist}
                          {song.album ? ` · ${song.album}` : ""}
                        </p>
                      </div>
                      <span className="hidden text-xs text-muted-foreground sm:block">{song.duration ?? ""}</span>
                      <Button variant="subtle" size="icon-sm" aria-label={`Play ${song.title}`} onClick={() => playTrack(toLibraryTrack(song), songs.map(toLibraryTrack))}>
                        <Play size={16} />
                      </Button>
                      <LikeButton track={toLibraryTrack(song)} className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[active=true]:opacity-100" />
                      <TrackActionsMenu track={toLibraryTrack(song)} />
                      <a href={`https://music.youtube.com/watch?v=${encodeURIComponent(song.videoId)}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${song.title} on YouTube Music`} className="rounded-full p-2 text-muted-foreground opacity-70 transition hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"><ExternalLink size={16} /></a>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {((activeTab === "songs" && songs.length === 0) ||
            (activeTab === "artists" && artists.length === 0) ||
            (activeTab === "albums" && albums.length === 0) ||
            (activeTab === "all" && songs.length === 0 && artists.length === 0 && albums.length === 0)) && (
            <div className="mt-10">
              <EmptyState icon={<SearchX />} title={`No ${activeTab === "all" ? "results" : activeTab} for “${query}”`}>
                Try another search or choose a different category.
              </EmptyState>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
