import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Info, Play } from "lucide-react";

import heroImage from "@/assets/ghost-hero.jpg";
import { AlbumCard } from "@/components/ghost/AlbumCard";
import { Artwork } from "@/components/ghost/Artwork";
import { useLibrary } from "@/components/ghost/library-context";
import { Page, Section } from "@/components/ghost/page-parts";
import { usePlayer } from "@/components/ghost/player-context";
import { SourceInfoDialog } from "@/components/ghost/SourceInfoDialog";
import { TrackList } from "@/components/ghost/TrackList";
import { Button } from "@/components/ui/button";
import { featuredQuery } from "@/lib/music/source";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GHOST Music — Home" },
      { name: "description", content: "A dark, minimal music player with a demo catalog, playlists, likes and queue." },
      { property: "og:title", content: "GHOST Music" },
      { property: "og:description", content: "A dark, minimal music player with a demo catalog, playlists, likes and queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQuery()),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(featuredQuery());
  const { playTracks } = usePlayer();
  const { history, ready } = useLibrary();
  const playable = data.tracks.filter((t) => t.playable);
  const recent = history.slice(0, 6);

  return (
    <Page>
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-glow">
        <img
          src={heroImage}
          alt=""
          width={1600}
          height={640}
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <div className="hero-fade absolute inset-0" aria-hidden />
        <div className="relative max-w-xl px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Demo catalog</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] text-foreground sm:text-6xl">
            Music for the quiet hours.
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            You're browsing sample music. Songs marked <span className="font-semibold text-primary">Demo</span>{" "}
            play short original loops; the full catalog needs a supported music provider.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button variant="glow" size="lg" onClick={() => playTracks(playable)}>
              <Play className="fill-current" /> Play demo mix
            </Button>
            <SourceInfoDialog
              trigger={
                <Button variant="pill" size="lg">
                  <Info /> How playback works
                </Button>
              }
            />
          </div>
        </div>
      </section>

      {ready && recent.length > 0 && (
        <Section
          title="Jump back in"
          action={
            <Link to="/history" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              See history
            </Link>
          }
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map(({ track }) => (
              <button
                key={track.id}
                type="button"
                onClick={() => playTracks(recent.map((r) => r.track), recent.findIndex((r) => r.track.id === track.id))}
                className="group flex items-center gap-3 overflow-hidden rounded-lg bg-surface-raised/70 pr-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Artwork art={track.art} size="sm" className="size-14 rounded-none" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{track.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{track.artist}</span>
                </span>
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-glow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Play className="size-4 fill-current" />
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Featured tracks">
        <TrackList tracks={data.tracks} label="Featured tracks" />
      </Section>

      <Section
        title="Albums"
        action={
          <Link to="/explore" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            Explore
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.albums.map((a) => (
            <AlbumCard key={a.id} album={a} />
          ))}
        </div>
      </Section>
    </Page>
  );
}
