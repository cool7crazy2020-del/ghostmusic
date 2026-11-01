import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ExternalLink, ListMusic, LoaderCircle, Plus, X } from "lucide-react";
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
  const { playlists, ready, createPlaylist, addToPlaylist } = useLibrary();
  const [open, setOpen] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [pastedTrackList, setPastedTrackList] = useState("");
  const [spotifyEmbed, setSpotifyEmbed] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState("");
  const [spotifyOpen, setSpotifyOpen] = useState(false);
  const [importMode, setImportMode] = useState<"new" | "existing">("new");
  const [targetPlaylistId, setTargetPlaylistId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, added: 0 });
  const [importUnmatched, setImportUnmatched] = useState<string[]>([]);
  const [importComplete, setImportComplete] = useState(false);

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

  async function importSpotifyPlaylist() {
    setSpotifyError("");
    setImportUnmatched([]);
    setImportComplete(false);
    if (importMode === "existing" && !targetPlaylistId) {
      setSpotifyError("Choose the GHOST playlist to add songs to.");
      return;
    }
    const playlistId = importMode === "new" ? createPlaylist("Spotify Import") : targetPlaylistId;
    setImporting(true);
    try {
      const response = await fetch("https://ghostmusic-s8vd.onrender.com/api/spotify-playlist?url=" + encodeURIComponent(spotifyUrl.trim()));
      const data = await response.json() as { tracks?: { title: string; artist: string }[]; error?: string };
      if (!response.ok || !data.tracks?.length) throw new Error(data.error || "Couldn't read the Spotify playlist.");
      const tracks = data.tracks;
      let added = 0;
      const unmatched: string[] = [];
      setImportProgress({ done: 0, total: tracks.length, added: 0 });
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      for (let index = 0; index < tracks.length; index++) {
        const item = tracks[index];
        try {
          const searchResponse = await fetch("https://ghostmusic-s8vd.onrender.com/api/search?q=" + encodeURIComponent(item.title + " " + item.artist) + "&limit=8");
          const searchData = await searchResponse.json() as { results?: { videoId: string; title: string; artist: string; duration?: string | null; album?: string | null }[] };
          const candidates = searchResponse.ok ? searchData.results || [] : [];
          const wantedTitle = normalize(item.title);
          const wantedArtist = normalize(item.artist);
          const ranked = candidates.map(song => {
            const title = normalize(song.title);
            const artist = normalize(song.artist);
            const titleScore = title === wantedTitle ? 3 : title.includes(wantedTitle) || wantedTitle.includes(title) ? 1 : 0;
            const artistScore = artist.includes(wantedArtist) || wantedArtist.includes(artist) ? 2 : 0;
            return { song, score: titleScore + artistScore };
          }).sort((a, b) => b.score - a.score);
          const best = ranked[0];
          if (!best || best.score < 2 || !best.song.videoId) {
            unmatched.push(item.title + " — " + item.artist);
          } else {
            const song = best.song;
            const duration = song.duration?.split(":").reduce((total, part) => total * 60 + Number(part), 0) ?? 0;
            addToPlaylist(playlistId, {
              id: "yt-" + song.videoId, title: song.title, artist: song.artist || item.artist,
              albumId: song.videoId, albumTitle: song.album ?? "Unknown album",
              durationSec: Number.isFinite(duration) ? duration : 0, art: 0, genre: "unknown",
              playable: true, sourceId: "youtube-audio",
              sourceUrl: "https://www.youtube.com/watch?v=" + encodeURIComponent(song.videoId),
            });
            added++;
          }
        } catch {
          unmatched.push(item.title + " — " + item.artist);
        }
        setImportProgress({ done: index + 1, total: tracks.length, added });
      }
      setImportUnmatched(unmatched);
      setImportComplete(true);
      if (added === 0 && unmatched.length) setSpotifyError("The playlist was read, but no tracks could be confidently matched to YouTube.");
    } catch (error) {
      setSpotifyError(error instanceof Error ? error.message : "Spotify playlist import failed.");
    } finally {
      setImporting(false);
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
                <h2 id="spotify-import-title" className="text-xl font-bold">Import a Spotify playlist</h2>
                <p className="mt-1 text-sm text-muted-foreground">Bring your Spotify songs into a GHOST playlist.</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close Spotify playlist" onClick={() => setSpotifyOpen(false)}><X /></Button>
            </div>
            <div className="space-y-3 p-5">
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); openSpotifyPlaylist(); }}>
                <input value={spotifyUrl} onChange={(event) => setSpotifyUrl(event.target.value)} placeholder="https://open.spotify.com/playlist/…" aria-label="Spotify playlist URL" className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <Button type="submit" variant="glow">Open playlist</Button>
              </form>
              {spotifyError && <p role="alert" className="text-sm text-destructive">{spotifyError}</p>}
              <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Fallback: paste track list</summary><p className="mt-2 text-xs text-muted-foreground">Paste one song per line as Song Title — Artist.</p><textarea value={pastedTrackList} onChange={event => setPastedTrackList(event.target.value)} rows={5} className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" aria-label="Paste playlist track list" /></details>
              {spotifyEmbed ? (
                <iframe title="Spotify playlist player" src={spotifyEmbed} width="100%" height="500" style={{ border: 0, borderRadius: 12 }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
              ) : (
                <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">Your playlist will appear here after you paste its link.</div>
              )}

              <div className="grid gap-3 rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">Where should the songs go?</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={importMode === "new" ? "glow" : "outline"} disabled={importing} onClick={() => setImportMode("new")}>Create new playlist</Button>
                  <Button type="button" variant={importMode === "existing" ? "glow" : "outline"} disabled={importing} onClick={() => setImportMode("existing")}>Add to existing</Button>
                </div>
                {importMode === "existing" && <select value={targetPlaylistId} onChange={(event) => setTargetPlaylistId(event.target.value)} disabled={importing} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Choose a GHOST playlist…</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name} ({playlist.tracks.length} songs)</option>)}</select>}
                <Button type="button" variant="glow" disabled={importing || !spotifyUrl.trim()} onClick={importSpotifyPlaylist}>{importing ? <><LoaderCircle className="size-4 animate-spin" /> Importing {importProgress.done}/{importProgress.total || "…"}</> : <><Check className="size-4" /> Import songs into GHOST</>}</Button>
                {importing && importProgress.total > 0 && <div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: (Math.round(importProgress.done / importProgress.total * 100)) + "%" }} /></div><p className="text-xs text-muted-foreground">{importProgress.added} matched · {importProgress.done} of {importProgress.total} checked</p></div>}
                {importComplete && <p className="text-sm text-foreground">Import finished: {importProgress.added} songs matched. {importUnmatched.length} couldn't be matched.</p>}
                {importUnmatched.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-medium">Show unmatched songs ({importUnmatched.length})</summary><ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-muted-foreground">{importUnmatched.map((song, index) => <li key={song + index}>{song}</li>)}</ul></details>}
              </div>
              {spotifyEmbed && <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">Preview Spotify playlist</summary><iframe title="Spotify playlist preview" src={spotifyEmbed} width="100%" height="350" style={{ border: 0, borderRadius: 12, marginTop: 12 }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" /></details>}
              <p className="text-xs leading-relaxed text-muted-foreground">GHOST reads the public Spotify playlist page without Spotify API credentials, then matches songs to YouTube. Spotify may block track-list access for some playlists. Matching is best-effort; duplicate YouTube tracks are skipped.</p>
            </div>
          </div>
        </div>
      )}
      <CreatePlaylistDialog open={open} onOpenChange={setOpen} />
    </Page>
  );
}
