import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Play } from "lucide-react";

import { useLibrary } from "@/components/ghost/library-context";
import { CollectionHeader, EmptyState, LoadingRows, Page } from "@/components/ghost/page-parts";
import { usePlayer } from "@/components/ghost/player-context";
import { TrackList } from "@/components/ghost/TrackList";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/liked")({
  head: () => ({
    meta: [
      { title: "Liked Songs — GHOST Music" },
      { name: "description", content: "The songs you've liked in GHOST Music, saved in this browser." },
      { property: "og:title", content: "Liked Songs — GHOST Music" },
      { property: "og:description", content: "The songs you've liked in GHOST Music, saved in this browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Liked,
});

function Liked() {
  const { liked, ready } = useLibrary();
  const { playTracks } = usePlayer();

  return (
    <Page>
      <CollectionHeader
        eyebrow="Collection"
        title="Liked Songs"
        art={
          <div className="flex size-40 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow sm:size-48">
            <Heart className="size-16 fill-current" />
          </div>
        }
        meta={ready ? `${liked.length} ${liked.length === 1 ? "song" : "songs"} · saved in this browser` : " "}
        actions={
          liked.length > 0 && (
            <Button variant="glow" size="icon-xl" aria-label="Play liked songs" onClick={() => playTracks(liked)}>
              <Play className="translate-x-px fill-current" />
            </Button>
          )
        }
      />
      {!ready ? (
        <LoadingRows />
      ) : liked.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="Songs you like will appear here"
          action={
            <Button asChild variant="glow">
              <Link to="/explore">Find something to like</Link>
            </Button>
          }
        >
          Tap the heart on any track to save it.
        </EmptyState>
      ) : (
        <TrackList tracks={liked} label="Liked songs" />
      )}
    </Page>
  );
}
