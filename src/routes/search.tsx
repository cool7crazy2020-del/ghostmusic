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

type AlbumDetailResponse = { album?: AlbumResult; tracks?: SongResult[]; error?: string };

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
  const [resultLimit, setResultLimit] = useState(20);
  const [expandedAlbumId, setExpandedAlbumId] = useState<string | null>(null);
  const { playTrack } = usePlayer();

  const { data, isFetching, isError } = useQuery({
    queryKey: ["ghost-search", query, resultLimit],
    queryFn: async (): Promise<SearchResponse> => {
      const response = await fetch(`${SEARCH_API}?q=${encodeURIComponent(query)}&limit=${resultLimit}`);
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
  const { data: expandedAlbumData, isFetching: isAlbumTracksLoading, isError: isAlbumTracksError } = useQuery({
    queryKey: ["ghost-album-tracklist", expandedAlbumId],
    queryFn: async (): Promise<AlbumDetailResponse> => {
      const response = await fetch("https://ghostmusic-s8vd.onrender.com/api/albums/" + encodeURIComponent(expandedAlbumId!));
      const result = (await response.json()) as AlbumDetailResponse;
      if (!response.ok) throw new Error(result.error ?? "Could not load album tracks.");
      return result;
    },
    enabled: !!expandedAlbumId,
    staleTime: 60_000,
  });

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
                  <button
                    key={album.id}
                    type="button"
                    aria-expanded={expandedAlbumId === album.id}
                    onClick={() => setExpandedAlbumId((current) => current === album.id ? null : album.id)}
                    className={`group min-w-0 rounded-xl p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${expandedAlbumId === album.id ? "bg-accent ring-1 ring-primary/40" : ""}`}
                  >
                    {album.thumbnail ? (
                      <img src={album.thumbnail} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover shadow-md transition-transform group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted"><Music2 size={32} /></div>
                    )}
                    <h2 className="mt-3 truncate text-sm font-semibold">{album.title}</h2>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{album.artist}{album.year ? ` · ${album.year}` : ""}</p>
                    <p className="mt-2 text-xs font-medium text-primary">{expandedAlbumId === album.id ? "Hide tracklist" : "View tracklist"}</p>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {expandedAlbumId && (activeTab === "all" || activeTab === "albums") && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpandedAlbumId(null); }}>
            <section role="dialog" aria-modal="true" aria-label="Album tracklist" className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto overscroll-contain rounded-2xl border border-border/70 bg-surface shadow-2xl">
              {(() => {
                const album = albums.find((item) => item.id === expandedAlbumId);
                const albumTracks = expandedAlbumData?.tracks ?? [];
                const playableTracks = albumTracks.map(toLibraryTrack);
                return (
                  <>
                    <div className="relative isolate flex flex-col gap-6 overflow-hidden p-6 sm:flex-row sm:items-end sm:p-8">
                      {album?.thumbnail && <img src={album.thumbnail} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-20 blur-2xl" /> }
                      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-background/45" />
                      {album?.thumbnail ? <img src={album.thumbnail} alt={album.title} className="aspect-square w-44 shrink-0 rounded-xl object-cover shadow-2xl sm:w-56" /> : <div className="flex aspect-square w-44 shrink-0 items-center justify-center rounded-xl bg-muted sm:w-56"><Music2 size={48} /></div>}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Album</p>
                        <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">{album?.title ?? "Album"}</h2>
                        <p className="mt-3 text-sm font-medium text-foreground">{album?.artist ?? "Unknown artist"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{album?.year ?? ""}{albumTracks.length ? ` · ${albumTracks.length} songs` : ""}</p>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          <Button variant="glow" size="lg" disabled={!playableTracks.length} onClick={() => playTrack(playableTracks[0], playableTracks)}><Play className="size-4 fill-current" /> Play album</Button>
                          <Button variant="subtle" size="lg" onClick={() => setExpandedAlbumId(null)}>Close album</Button>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-5 sm:px-6">
                      <div className="mb-2 grid grid-cols-[2rem_minmax(0,1fr)_4rem] gap-3 border-b border-border px-3 py-3 text-xs uppercase tracking-wider text-muted-foreground"><span>#</span><span>Title</span><span className="text-right">Time</span></div>
                      {isAlbumTracksLoading ? <p className="px-3 py-8 text-sm text-muted-foreground">Loading album tracks…</p> : isAlbumTracksError ? <p className="px-3 py-8 text-sm text-muted-foreground">Couldn’t load this album’s tracklist. Try clicking the album again.</p> : albumTracks.length ? (
                        <div className="divide-y divide-border/60">
                          {albumTracks.map((song, index) => (
                            <div key={song.videoId} className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/60 sm:grid-cols-[2rem_minmax(0,1fr)_4rem_auto]">
                              <span className="text-sm tabular-nums text-muted-foreground">{index + 1}</span>
                              <div className="flex min-w-0 items-center gap-3">{song.thumbnail && <img src={song.thumbnail} alt="" loading="lazy" className="size-10 shrink-0 rounded-md object-cover" />}<div className="min-w-0"><p className="truncate text-sm font-medium">{song.title}</p><p className="truncate text-xs text-muted-foreground">{song.artist}</p></div></div>
                              <span className="text-right text-xs tabular-nums text-muted-foreground">{song.duration ?? ""}</span>
                              <Button variant="subtle" size="icon-sm" aria-label={`Play ${song.title}`} onClick={() => playTrack(toLibraryTrack(song), playableTracks)}><Play size={15} /></Button>
                            </div>
                          ))}
                        </div>
                      ) : <p className="px-3 py-8 text-sm text-muted-foreground">No tracks were returned for this album.</p>}
                    </div>
                  </>
                );
              })()}
            </section>
            </div>
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

          {query && !isFetching && !isError && (songs.length >= resultLimit || albums.length >= resultLimit || artists.length >= resultLimit) && (
            <div className="flex justify-center py-8">
              <Button variant="subtle" onClick={() => setResultLimit((limit) => Math.min(limit + 20, 100))} disabled={resultLimit >= 100}>
                Show more
              </Button>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
