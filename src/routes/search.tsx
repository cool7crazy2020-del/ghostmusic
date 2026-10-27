import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { SearchX } from "lucide-react";

import { AlbumCard } from "@/components/ghost/AlbumCard";
import { Artwork } from "@/components/ghost/Artwork";
import { EmptyState, Page, Section } from "@/components/ghost/page-parts";
import { TrackList } from "@/components/ghost/TrackList";
import { activeSource, genresQuery, searchQuery } from "@/lib/music/source";

type SearchParams = { q?: string };

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search — GHOST Music" },
      { name: "description", content: "Search songs, artists and albums in the GHOST Music demo catalog." },
      { property: "og:title", content: "Search — GHOST Music" },
      { property: "og:description", content: "Search songs, artists and albums in the GHOST Music demo catalog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(genresQuery()),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const query = q?.trim() ?? "";
  const { data: genres } = useSuspenseQuery(genresQuery());
  const { data, isFetching } = useQuery({
    ...searchQuery(query),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });

  return (
    <Page>
      <div className="mt-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{query ? `Results for “${query}”` : "Search"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Searching the {activeSource.name} only — not a real music service.
        </p>
      </div>

      {!query ? (
        <Section title="Browse by genre">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {genres.map((g) => (
              <Link
                key={g.id}
                to="/explore"
                search={{ genre: g.id }}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Artwork art={g.art} size="lg" className="absolute inset-0 h-full w-full rounded-none transition-transform duration-500 group-hover:scale-110" />
                <span className="absolute inset-x-0 bottom-0 p-3 font-display text-lg font-bold text-foreground">
                  {g.name}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      ) : data && data.tracks.length + data.albums.length > 0 ? (
        <div aria-busy={isFetching}>
          {data.tracks.length > 0 && (
            <Section title="Songs">
              <TrackList tracks={data.tracks} label={`Songs matching ${query}`} />
            </Section>
          )}
          {data.albums.length > 0 && (
            <Section title="Albums">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {data.albums.map((a) => (
                  <AlbumCard key={a.id} album={a} />
                ))}
              </div>
            </Section>
          )}
        </div>
      ) : data ? (
        <div className="mt-10">
          <EmptyState icon={<SearchX />} title={`No matches for “${query}”`}>
            The demo catalog only has a handful of sample songs. Try “midnight”, “synthwave” or “Vela Moon”.
            Real songs need a supported music provider.
          </EmptyState>
        </div>
      ) : null}
    </Page>
  );
}
