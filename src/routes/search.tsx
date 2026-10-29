import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink, Music2, SearchX } from "lucide-react";

import { Artwork } from "@/components/ghost/Artwork";
import { EmptyState, Page, Section } from "@/components/ghost/page-parts";
import { genresQuery } from "@/lib/music/source";

type SearchParams = { q?: string };

type ArtistResult = {
  id: string;
  name: string;
  thumbnail: string | null;
  subscribers?: string | null;
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
  error?: string;
};

const SEARCH_API = "https://ghostmusic-s8vd.onrender.com/api/search";

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
        content: "Discover songs and artists on GHOST Music.",
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

  const { data, isFetching, isError } = useQuery({
    queryKey: ["ghost-search", query],
    queryFn: async (): Promise<SearchResponse> => {
      const response = await fetch(
        `${SEARCH_API}?q=${encodeURIComponent(query)}`,
      );
      let result: SearchResponse;
      try {
        result = (await response.json()) as SearchResponse;
      } catch {
        throw new Error("The search service returned an invalid response.");
      }
      if (!response.ok) {
        throw new Error(result.error ?? "Music search failed.");
      }
      return result;
    },
    enabled: query.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  const songs = data?.results ?? [];
  const artists = data?.artists ?? [];

  return (
    <Page>
      <div className="mt-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {query ? `Search results for “${query}”` : "Search"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Find songs, artists, and your next obsession.
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
        <p className="mt-8 text-sm text-muted-foreground">Searching…</p>
      ) : isError ? (
        <div className="mt-10">
          <EmptyState icon={<SearchX />} title="Search failed">
            We couldn&apos;t load results. Please try again.
          </EmptyState>
        </div>
      ) : (
        <>
          {artists.length > 0 && (
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
                      <img
                        src={artist.thumbnail}
                        alt=""
                        loading="lazy"
                        className="mx-auto aspect-square w-full max-w-40 rounded-full object-cover shadow-lg transition-transform group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="mx-auto flex aspect-square w-full max-w-40 items-center justify-center rounded-full bg-muted">
                        <Music2 size={36} />
                      </div>
                    )}
                    <h2 className="mt-3 truncate text-center font-semibold">
                      {artist.name}
                    </h2>
                    <p className="mt-1 text-center text-xs text-muted-foreground">
                      Artist
                    </p>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {songs.length > 0 && (
            <Section title="Songs">
              <div className="divide-y divide-border/70">
                {songs.map((song, index) => {
                  const primaryArtist = song.artists?.[0];
                  const artistHref = primaryArtist?.id;
                  return (
                    <div
                      key={song.videoId || `${song.title}-${index}`}
                      className="group flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                    >
                      {song.thumbnail ? (
                        <img
                          src={song.thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Music2 size={18} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={`https://music.youtube.com/watch?v=${encodeURIComponent(song.videoId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm font-medium hover:text-primary"
                        >
                          {song.title}
                        </a>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {artistHref ? (
                            <Link
                              to="/artist/$artistId"
                              params={{ artistId: primaryArtist!.id! }}
                              className="hover:text-foreground hover:underline"
                            >
                              {primaryArtist!.name}
                            </Link>
                          ) : (
                            song.artist
                          )}
                          {song.album ? ` · ${song.album}` : ""}
                        </p>
                      </div>
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {song.duration ?? ""}
                      </span>
                      <a
                        href={`https://music.youtube.com/watch?v=${encodeURIComponent(song.videoId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${song.title} on YouTube Music`}
                        className="rounded-full p-2 text-muted-foreground opacity-70 transition hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {artists.length === 0 && songs.length === 0 && (
            <div className="mt-10">
              <EmptyState
                icon={<SearchX />}
                title={`No results for “${query}”`}
              >
                Try searching for another song or artist.
              </EmptyState>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
