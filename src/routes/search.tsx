import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { SearchX, ExternalLink } from "lucide-react";

import { Artwork } from "@/components/ghost/Artwork";
import { EmptyState, Page, Section } from "@/components/ghost/page-parts";
import { genresQuery } from "@/lib/music/source";

type SearchParams = { q?: string };

type YouTubeResult = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string | null;
};

type YouTubeResponse = {
  results?: YouTubeResult[];
  error?: string;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q:
      typeof search.q === "string" && search.q.trim()
        ? search.q
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search — GHOST Music" },
      {
        name: "description",
        content: "Discover music videos on GHOST Music.",
      },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(genresQuery()),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const query = q?.trim() ?? "";
  const { data: genres } = useSuspenseQuery(genresQuery());

  const {
    data,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["youtube-search", query],
    queryFn: async (): Promise<YouTubeResponse> => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`,
      );

      const result = (await response.json()) as YouTubeResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "YouTube search failed.");
      }

      return result;
    },
    enabled: query.length > 0,
    staleTime: 60_000,
  });

  const results = data?.results ?? [];

  return (
    <Page>
      <div className="mt-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {query ? `Results for “${query}”` : "Search"}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Discover your next obsession.
        </p>
      </div>

      {!query ? (
        <Section title="Browse by genre">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {genres.map((genre) => (
              <Link
                key={genre.id}
                to="/explore"
                search={{ genre: genre.id }}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Artwork
                  art={genre.art}
                  size="lg"
                  className="absolute inset-0 h-full w-full rounded-none transition-transform duration-500 group-hover:scale-110"
                />
                <span className="absolute inset-x-0 bottom-0 p-3 font-display text-lg font-bold text-foreground">
                  {genre.name}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      ) : isFetching ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Searching YouTube…
        </p>
      ) : isError ? (
        <div className="mt-10">
          <EmptyState
            icon={<SearchX />}
            title="Search failed"
          >
            We couldn't load YouTube results. Please try again.
          </EmptyState>
        </div>
      ) : results.length > 0 ? (
        <Section title="YouTube results">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((result) => (
              <a
                key={result.videoId}
                href={`https://www.youtube.com/watch?v=${encodeURIComponent(result.videoId)}`}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:bg-accent"
              >
                {result.thumbnail && (
                  <img
                    src={result.thumbnail}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                )}

                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 font-semibold">
                      {result.title}
                    </h2>
                    <p className="mt-2 truncate text-sm text-muted-foreground">
                      {result.artist}
                    </p>
                  </div>

                  <ExternalLink
                    size={18}
                    className="mt-1 shrink-0 text-muted-foreground"
                  />
                </div>
              </a>
            ))}
          </div>
        </Section>
      ) : (
        <div className="mt-10">
          <EmptyState
            icon={<SearchX />}
            title={`No results for “${query}”`}
          >
            Try searching for another song or artist.
          </EmptyState>
        </div>
      )}
    </Page>
  );
}
