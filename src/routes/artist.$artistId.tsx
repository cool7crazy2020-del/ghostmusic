import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Music2, SearchX } from "lucide-react";

import { EmptyState, Page, Section } from "@/components/ghost/page-parts";

type ArtistTrack = {
  videoId?: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  duration?: string | null;
  album?: string | null;
};

type ArtistProfile = {
  id: string;
  name: string;
  description?: string;
  thumbnail: string | null;
  subscribers?: string | null;
  songs: ArtistTrack[];
  error?: string;
};

const API = "https://ghostmusic-s8vd.onrender.com/api";

export const Route = createFileRoute("/artist/$artistId")({
  head: () => ({
    meta: [
      { title: "Artist — GHOST Music" },
      { name: "description", content: "Artist profile on GHOST Music." },
    ],
  }),
  component: ArtistPage,
});

function ArtistPage() {
  const { artistId } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["artist-profile", artistId],
    queryFn: async (): Promise<ArtistProfile> => {
      const response = await fetch(`${API}/artists/${encodeURIComponent(artistId)}`);
      const result = (await response.json()) as ArtistProfile;
      if (!response.ok) throw new Error(result.error ?? "Could not load artist.");
      return result;
    },
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <Page>
      <Link
        to="/search"
        className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to search
      </Link>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading artist…</p>
      ) : isError || !data ? (
        <div className="mt-10">
          <EmptyState icon={<SearchX />} title="Artist unavailable">
            We couldn&apos;t load this artist profile. Try searching again.
          </EmptyState>
        </div>
      ) : (
        <>
          <header className="relative mt-6 flex min-h-64 items-end gap-6 overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-10">
            {data.thumbnail && (
              <img
                src={data.thumbnail}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-20 blur-2xl"
              />
            )}
            <div className="relative flex w-full flex-col items-center gap-6 sm:flex-row sm:items-end">
              {data.thumbnail ? (
                <img
                  src={data.thumbnail}
                  alt={data.name}
                  className="h-36 w-36 shrink-0 rounded-full border border-border object-cover shadow-2xl sm:h-48 sm:w-48"
                />
              ) : (
                <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-muted sm:h-48 sm:w-48">
                  <Music2 size={48} />
                </div>
              )}
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Artist
                </p>
                <h1 className="mt-2 break-words text-4xl font-extrabold tracking-tight sm:text-6xl">
                  {data.name}
                </h1>
                {data.subscribers && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {data.subscribers}
                  </p>
                )}
              </div>
            </div>
          </header>

          {data.description && (
            <Section title="About">
              <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {data.description}
              </p>
            </Section>
          )}

          <Section title="Popular">
            {data.songs.length ? (
              <div className="divide-y divide-border/70">
                {data.songs.map((song, index) => (
                  <a
                    key={song.videoId ?? `${song.title}-${index}`}
                    href={song.videoId ? `https://music.youtube.com/watch?v=${encodeURIComponent(song.videoId)}` : "https://music.youtube.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                  >
                    <span className="w-5 shrink-0 text-right text-sm text-muted-foreground">
                      {index + 1}
                    </span>
                    {song.thumbnail ? (
                      <img src={song.thumbnail} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Music2 size={18} />
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium group-hover:text-primary">
                        {song.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {song.album || song.artist || data.name}
                      </span>
                    </span>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {song.duration ?? ""}
                    </span>
                    <ExternalLink size={16} className="shrink-0 text-muted-foreground" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Popular tracks aren&apos;t available for this artist yet.
              </p>
            )}
          </Section>
          <p className="mt-4 text-xs text-muted-foreground">
            Track links open on YouTube Music. GHOST playback will be available
            when a licensed audio source is connected.
          </p>
        </>
      )}
    </Page>
  );
}
