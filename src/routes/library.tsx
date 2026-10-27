import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, History, ListMusic, Plus } from "lucide-react";
import { useState } from "react";

import { CreatePlaylistDialog } from "@/components/ghost/CreatePlaylistDialog";
import { useLibrary } from "@/components/ghost/library-context";
import { Page, Section } from "@/components/ghost/page-parts";
import { TrackList } from "@/components/ghost/TrackList";
import { Button } from "@/components/ui/button";

import { PlaylistCover } from "./playlists.index";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your Library — GHOST Music" },
      { name: "description", content: "Your liked songs, playlists and listening history in GHOST Music." },
      { property: "og:title", content: "Your Library — GHOST Music" },
      { property: "og:description", content: "Your liked songs, playlists and listening history in GHOST Music." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { liked, playlists, history, ready } = useLibrary();
  const [open, setOpen] = useState(false);
  const count = (n: number, word: string) => (ready ? `${n} ${word}${n === 1 ? "" : "s"}` : "—");

  const tiles = [
    { to: "/liked" as const, label: "Liked Songs", sub: count(liked.length, "song"), icon: Heart, highlight: true },
    { to: "/playlists" as const, label: "Playlists", sub: count(playlists.length, "playlist"), icon: ListMusic },
    { to: "/history" as const, label: "History", sub: count(history.length, "play"), icon: History },
  ];

  return (
    <Page>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Your Library</h1>
          <p className="mt-2 text-sm text-muted-foreground">Everything here is saved in this browser.</p>
        </div>
        <Button variant="pill" onClick={() => setOpen(true)}>
          <Plus /> New playlist
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={
              t.highlight
                ? "flex items-center gap-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                : "flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            }
          >
            <t.icon className={t.highlight ? "size-8 fill-current" : "size-8 text-primary"} />
            <div>
              <div className="font-display text-lg font-bold">{t.label}</div>
              <div className={t.highlight ? "text-sm opacity-80" : "text-sm text-muted-foreground"}>{t.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {ready && playlists.length > 0 && (
        <Section title="Playlists">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {playlists.map((p) => (
              <Link
                key={p.id}
                to="/playlists/$playlistId"
                params={{ playlistId: p.id }}
                className="flex flex-col gap-3 rounded-xl bg-surface p-3 transition-all hover:bg-surface-raised hover:shadow-glow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlaylistCover playlist={p} className="aspect-square w-full" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.tracks.length} songs</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {ready && liked.length > 0 && (
        <Section
          title="Recently liked"
          action={
            <Link to="/liked" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              See all
            </Link>
          }
        >
          <TrackList tracks={liked.slice(0, 5)} label="Recently liked" />
        </Section>
      )}
      <CreatePlaylistDialog open={open} onOpenChange={setOpen} />
    </Page>
  );
}
