import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, Headphones, Music2, Search } from "lucide-react";
import type { Track } from "@/lib/music/types";
import { LikeButton } from "@/components/ghost/LikeButton";
import { TrackActionsMenu } from "@/components/ghost/TrackActionsMenu";

import { Page, Section } from "@/components/ghost/page-parts";

type TrackResult = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  duration?: string | null;
  album?: string | null;
  artists?: { id?: string; name: string }[];
};

type ArtistResult = {
  id: string;
  name: string;
  thumbnail: string | null;
};

type AlbumResult = {
  id: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  year?: string | number | null;
};

type SearchResponse = {
  results?: TrackResult[];
  artists?: ArtistResult[];
  albums?: AlbumResult[];
};

const SEARCH_API = "https://ghostmusic-s8vd.onrender.com/api/search";

function toLibraryTrack(track: TrackResult): Track {
  const duration = track.duration?.split(":").reduce((total, part) => total * 60 + Number(part), 0) ?? 0;
  return { id: `yt-${track.videoId}`, title: track.title, artist: track.artist, albumId: track.videoId, albumTitle: track.album ?? "Unknown album", durationSec: Number.isFinite(duration) ? duration : 0, art: 0, genre: "unknown", playable: false, sourceId: "youtube-music-link" };
}

async function searchMusic(query: string): Promise<SearchResponse> {
  const response = await fetch(`${SEARCH_API}?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Music discovery is temporarily unavailable.");
  return (await response.json()) as SearchResponse;
}


function MusicRows({ tracks }: { tracks: TrackResult[] }) {
  return (
    <div className="divide-y divide-border/70">
      {tracks.slice(0, 6).map((track, index) => (
        <a
          key={track.videoId || `${track.title}-${index}`}
          href={`https://music.youtube.com/watch?v=${encodeURIComponent(track.videoId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
        >
          {track.thumbnail ? (
            <img src={track.thumbnail} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted"><Music2 size={18} /></div>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold group-hover:text-primary">{track.title}</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{track.artist}{track.album ? ` · ${track.album}` : ""}</span>
          </span>
          <span className="hidden text-xs text-muted-foreground sm:block">{track.duration ?? ""}</span>
          <LikeButton track={toLibraryTrack(track)} className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[active=true]:opacity-100" />
          <TrackActionsMenu track={toLibraryTrack(track)} />
          <ExternalLink size={16} className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GHOST Music" },
      { name: "description", content: "Discover songs, artists, and albums on GHOST Music." },
      { property: "og:title", content: "GHOST Music" },
      { property: "og:description", content: "Find your next favorite song." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const trending = useQuery({
    queryKey: ["home-discovery", "trending songs"],
    queryFn: () => searchMusic("trending songs"),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const artistsQuery = useQuery({
    queryKey: ["home-discovery", "popular artists"],
    queryFn: () => searchMusic("popular artists"),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const albumsQuery = useQuery({
    queryKey: ["home-discovery", "popular albums"],
    queryFn: () => searchMusic("popular albums"),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const tracks = trending.data?.results ?? [];
  const artists = artistsQuery.data?.artists ?? [];
  const albums = albumsQuery.data?.albums ?? [];

  return (
    <Page>
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-glow sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <Headphones size={14} /> YOUR MUSIC, YOUR MOOD
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Find your <span className="text-primary">next favorite.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Explore songs, discover artists, and find albums worth keeping on repeat.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/search" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow-sm transition-transform hover:scale-[1.02]">
              <Search size={17} /> Explore music <ArrowRight size={16} />
            </Link>
            
          </div>
        </div>
      </section>

      <Section title="Trending songs" action={<Link to="/search" className="text-sm font-semibold text-muted-foreground hover:text-foreground">See all</Link>}>
        {trending.isLoading ? (
          <div className="h-56 animate-pulse rounded-xl bg-surface" />
        ) : tracks.length > 0 ? (
          <MusicRows tracks={tracks} />
        ) : (
          <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">Music discovery is temporarily unavailable. Try searching for a song or artist.</p>
        )}
      </Section>

      <Section title="Artists to explore" action={<Link to="/search" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Discover artists</Link>}>
        {artistsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-full bg-surface" />)}</div>
        ) : artists.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {artists.slice(0, 6).map((artist) => (
              <Link key={artist.id} to="/artist/$artistId" params={{ artistId: artist.id }} className="group min-w-0 rounded-xl p-3 transition-colors hover:bg-accent">
                {artist.thumbnail ? <img src={artist.thumbnail} alt="" loading="lazy" className="mx-auto aspect-square w-full max-w-40 rounded-full object-cover transition-transform group-hover:scale-[1.03]" /> : <div className="mx-auto flex aspect-square w-full max-w-40 items-center justify-center rounded-full bg-muted"><Music2 size={32} /></div>}
                <p className="mt-3 truncate text-center text-sm font-semibold">{artist.name}</p>
                <p className="mt-1 text-center text-xs text-muted-foreground">Artist</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Artist discovery will appear here when the music service responds.</p>
        )}
      </Section>

      <Section title="Albums to discover" action={<Link to="/search" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Find albums</Link>}>
        {albumsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-surface" />)}</div>
        ) : albums.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {albums.slice(0, 5).map((album) => (
              <a key={album.id} href={`https://music.youtube.com/browse/${encodeURIComponent(album.id)}`} target="_blank" rel="noopener noreferrer" className="group min-w-0 rounded-xl p-3 transition-colors hover:bg-accent">
                {album.thumbnail ? <img src={album.thumbnail} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover shadow-md transition-transform group-hover:scale-[1.02]" /> : <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted"><Music2 size={32} /></div>}
                <h3 className="mt-3 truncate text-sm font-semibold">{album.title}</h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">{album.artist}{album.year ? ` · ${album.year}` : ""}</p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Album discovery will appear here when the music service responds.</p>
        )}
      </Section>
    </Page>
  );
}
