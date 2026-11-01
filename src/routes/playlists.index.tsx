import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, ListMusic, Plus, X } from "lucide-react";
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
  if (playlist.image) return <img src={playlist.image} alt={`${playlist.name} cover`} className={`rounded-lg object-cover ${className ?? ""}`} />;
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
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [spotifyEmbed, setSpotifyEmbed] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState("");
  const [spotifyOpen, setSpotifyOpen] = useState(false);

  function openSpotifyPlaylist() {
    setSpotifyError("");
    try {
      const url = new URL(spotifyUrl.trim());
      const allowedHost = url.hostname === "open.spotify.com" || url.hostname === "www.open.spotify.com";
      const match = url.pathname.match(/^\/playlist\/([a-zA-Z0-9]+)\/?$/);
      if (!allowedHost || !match) {
        setSpotifyError("Paste a Spotify playlist link, like https://open.spotify.com/playlist/…");
        return;
      }
      setSpotifyEmbed(`https://open.spotify.com/embed/playlist/${match[1]}?utm_source=ghostmusic`);
    } catch {
      setSpotifyError("That link doesn’t look right. Paste the full Spotify playlist URL.");
    }
  }

  return (
    <Page>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Playlists</h1>
          <p className="mt-2 text-sm text-muted-foreground">Saved in this browser.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setSpotifyOpen(true); setSpotifyEmbed(null); setSpotifyError(""); setSpotifyUrl(""); }}>
            <ExternalLink /> Open Spotify playlist
          </Button>
          <Button variant="glow" onClick={() => setOpen(true)}>
            <Plus /> New playlist
          </Button>
        </div>
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
      {spotifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="spotify-import-title">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 id="spotify-import-title" className="text-xl font-bold">Open a Spotify playlist</h2>
                <p className="mt-1 text-sm text-muted-foreground">Paste a link to view it right inside GHOST.</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close Spotify playlist" onClick={() => setSpotifyOpen(false)}><X /></Button>
            </div>
            <div className="space-y-3 p-5">
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); openSpotifyPlaylist(); }}>
                <input value={spotifyUrl} onChange={(event) => setSpotifyUrl(event.target.value)} placeholder="https://open.spotify.com/playlist/…" aria-label="Spotify playlist URL" className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <Button type="submit" variant="glow">Open playlist</Button>
              </form>
              {spotifyError && <p role="alert" className="text-sm text-destructive">{spotifyError}</p>}
              {spotifyEmbed ? (
                <iframe title="Spotify playlist player" src={spotifyEmbed} width="100%" height="500" style={{ border: 0, borderRadius: 12 }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
              ) : (
                <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">Your playlist will appear here after you paste its link.</div>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">No API or Spotify login inside GHOST needed. Spotify provides the embedded player; playback and sign-in limits are controlled by Spotify. This opens the playlist in GHOST—it doesn’t copy the songs into your GHOST library.</p>
            </div>
          </div>
        </div>
      )}
      <CreatePlaylistDialog open={open} onOpenChange={setOpen} />
    </Page>
  );
}
