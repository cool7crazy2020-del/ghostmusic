import { createFileRoute, Link } from "@tanstack/react-router";
import { ListMusic, Plus } from "lucide-react";
import { useState } from "react";

import { Artwork } from "@/components/ghost/Artwork";
import { CreatePlaylistDialog } from "@/components/ghost/CreatePlaylistDialog";
import { useLibrary } from "@/components/ghost/library-context";
import { EmptyState, Page } from "@/components/ghost/page-parts";
import { Button } from "@/components/ui/button";
import type { Playlist } from "@/lib/library-store";

export const Route = createFileRoute("/playlists/")({
  head: () => ({
    meta: [
      { title: "Playlists — GHOST Music" },
      { name: "description", content: "Create and manage your GHOST Music playlists." },
      { property: "og:title", content: "Playlists — GHOST Music" },
      { property: "og:description", content: "Create and manage your GHOST Music playlists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Playlists,
});

export function PlaylistCover({ playlist, className }: { playlist: Playlist; className?: string }) {
  const arts = playlist.tracks.slice(0, 4).map((t) => t.art);
  if (arts.length < 4) {
    return arts.length > 0 ? (
      <Artwork art={arts[0]} size="lg" className={className} />
    ) : (
      <div className={`flex items-center justify-center rounded-lg bg-surface-raised text-muted-foreground ${className ?? ""}`}>
        <ListMusic className="size-1/3" />
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-2 grid-rows-2 overflow-hidden rounded-lg ${className ?? ""}`} aria-hidden>
      {arts.map((a, i) => (
        <Artwork key={i} art={a} size="sm" className="h-full w-full rounded-none" />
      ))}
    </div>
  );
}

function Playlists() {
  const { playlists, ready } = useLibrary();
  const [open, setOpen] = useState(false);

  return (
    <Page>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Playlists</h1>
          <p className="mt-2 text-sm text-muted-foreground">Saved in this browser.</p>
        </div>
        <Button variant="glow" onClick={() => setOpen(true)}>
          <Plus /> New playlist
        </Button>
      </div>

      <div className="mt-8">
        {ready && playlists.length === 0 ? (
          <EmptyState
            icon={<ListMusic />}
            title="Create your first playlist"
            action={
              <Button variant="glow" onClick={() => setOpen(true)}>
                <Plus /> New playlist
              </Button>
            }
          >
            Then add songs from any track's “⋯” menu.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {playlists.map((p) => (
              <Link
                key={p.id}
                to="/playlists/$playlistId"
                params={{ playlistId: p.id }}
                className="group flex flex-col gap-3 rounded-xl bg-surface p-3 transition-all hover:bg-surface-raised hover:shadow-glow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlaylistCover playlist={p} className="aspect-square w-full" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {p.tracks.length} {p.tracks.length === 1 ? "song" : "songs"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <CreatePlaylistDialog open={open} onOpenChange={setOpen} />
    </Page>
  );
}
