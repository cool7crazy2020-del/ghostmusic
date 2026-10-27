import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";

import { Artwork } from "@/components/ghost/Artwork";
import { CollectionHeader, Page } from "@/components/ghost/page-parts";
import { usePlayer } from "@/components/ghost/player-context";
import { TrackList } from "@/components/ghost/TrackList";
import { Button } from "@/components/ui/button";
import { albumQuery } from "@/lib/music/source";

export const Route = createFileRoute("/album/$albumId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(albumQuery(params.albumId));
    if (!data) throw notFound();
    return { title: data.album.title, artist: data.album.artist };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} by ${loaderData.artist} — GHOST Music` : "Album — GHOST Music";
    const description = loaderData
      ? `${loaderData.title} by ${loaderData.artist}, from the GHOST Music demo catalog.`
      : "An album from the GHOST Music demo catalog.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "music.album" },
        { name: "twitter:card", content: "summary" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <Page>
      <div className="mt-16 text-center">
        <h1 className="text-2xl font-bold">Album not found</h1>
        <Link to="/explore" className="mt-4 inline-block text-primary hover:underline">
          Explore albums
        </Link>
      </div>
    </Page>
  ),
  component: AlbumPage,
});

function AlbumPage() {
  const { albumId } = Route.useParams();
  const { data } = useSuspenseQuery(albumQuery(albumId));
  const { playTracks, current, isPlaying, togglePlay } = usePlayer();
  if (!data) return null;
  const { album, tracks } = data;
  const playable = tracks.filter((t) => t.playable);
  const playingHere = !!current && current.albumId === album.id && isPlaying;
  const totalMin = Math.round(tracks.reduce((s, t) => s + t.durationSec, 0) / 60);

  return (
    <Page>
      <CollectionHeader
        eyebrow="Album · Demo"
        title={album.title}
        art={<Artwork art={album.art} size="lg" className="size-40 rounded-xl shadow-glow sm:size-48" />}
        meta={
          <>
            <span className="font-semibold text-foreground">{album.artist}</span> · {album.year} · {tracks.length}{" "}
            songs, about {totalMin} min · {playable.length} with demo audio
            <p className="mt-1">{album.description}</p>
          </>
        }
        actions={
          <>
            <Button
              variant="glow"
              size="icon-xl"
              aria-label={playingHere ? "Pause" : `Play ${album.title}`}
              onClick={() => (playingHere ? togglePlay() : playTracks(tracks))}
            >
              {playingHere ? <Pause className="fill-current" /> : <Play className="translate-x-px fill-current" />}
            </Button>
            {playable.length === 0 && (
              <span className="text-sm text-muted-foreground">No demo audio on this album — tracks will show as unavailable.</span>
            )}
          </>
        }
      />
      <TrackList tracks={tracks} showAlbum={false} label={`${album.title} tracks`} />
    </Page>
  );
}
