import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";

import { AlbumCard } from "@/components/ghost/AlbumCard";
import { Page, Section } from "@/components/ghost/page-parts";
import { usePlayer } from "@/components/ghost/player-context";
import { TrackList } from "@/components/ghost/TrackList";
import { Button } from "@/components/ui/button";
import { genreQuery, genresQuery } from "@/lib/music/source";

type ExploreSearch = { genre?: string };

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): ExploreSearch => ({
    genre: typeof search.genre === "string" ? search.genre : undefined,
  }),
  loaderDeps: ({ search }) => ({ genre: search.genre }),
  loader: async ({ context, deps }) => {
    const genres = await context.queryClient.ensureQueryData(genresQuery());
    const id = deps.genre && genres.some((g) => g.id === deps.genre) ? deps.genre : genres[0].id;
    await context.queryClient.ensureQueryData(genreQuery(id));
  },
  head: () => ({
    meta: [
      { title: "Explore — GHOST Music" },
      { name: "description", content: "Explore the GHOST Music demo catalog by genre and mood." },
      { property: "og:title", content: "Explore — GHOST Music" },
      { property: "og:description", content: "Explore the GHOST Music demo catalog by genre and mood." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { genre } = Route.useSearch();
  const { data: genres } = useSuspenseQuery(genresQuery());
  const selected = genres.find((g) => g.id === genre) ?? genres[0];
  const { data } = useSuspenseQuery(genreQuery(selected.id));
  const { playTracks } = usePlayer();
  const playable = data.tracks.filter((t) => t.playable);

  return (
    <Page>
      <div className="mt-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Explore</h1>
        <p className="mt-2 text-sm text-muted-foreground">Browse the sample catalog by genre.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Genres">
        {genres.map((g) => (
          <Button key={g.id} asChild variant="pill" size="sm" data-active={g.id === selected.id}>
            <Link to="/explore" search={{ genre: g.id }} role="tab" aria-selected={g.id === selected.id} replace>
              {g.name}
            </Link>
          </Button>
        ))}
      </div>

      <div className={`art-${selected.art} relative mt-6 overflow-hidden rounded-2xl p-6 sm:p-8`}>
        <div className="absolute inset-0 bg-background/40" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/80">Genre</p>
            <h2 className="mt-1 text-3xl font-extrabold text-foreground sm:text-4xl">{selected.name}</h2>
            <p className="mt-1 text-sm text-foreground/80">{selected.blurb}</p>
          </div>
          <Button
            variant="play"
            size="lg"
            disabled={playable.length === 0}
            onClick={() => playTracks(playable)}
          >
            <Play className="fill-current" />
            {playable.length ? "Play demo tracks" : "No demo audio in this genre"}
          </Button>
        </div>
      </div>

      <Section title="Songs">
        <TrackList tracks={data.tracks} label={`${selected.name} songs`} />
      </Section>

      {data.albums.length > 0 && (
        <Section title="Albums">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.albums.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
