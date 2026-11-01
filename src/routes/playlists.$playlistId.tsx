import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ImagePlus, ListMusic, MoreHorizontal, Pencil, Play, Plus, Search, Shuffle, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CreatePlaylistDialog } from "@/components/ghost/CreatePlaylistDialog";
import { useLibrary } from "@/components/ghost/library-context";
import { CollectionHeader, EmptyState, LoadingRows, Page } from "@/components/ghost/page-parts";
import { usePlayer } from "@/components/ghost/player-context";
import { TrackList } from "@/components/ghost/TrackList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Track } from "@/lib/music/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PlaylistCover } from "./playlists.index";

export const Route = createFileRoute("/playlists/$playlistId")({
  head: () => ({
    meta: [
      { title: "Playlist — GHOST Music" },
      { name: "description", content: "A personal playlist in GHOST Music, saved in this browser." },
      { property: "og:title", content: "Playlist — GHOST Music" },
      { property: "og:description", content: "A personal playlist in GHOST Music, saved in this browser." },
      { property: "og:type", content: "music.playlist" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlaylistPage,
});

function PlaylistPage() {
  const { playlistId } = Route.useParams();
  const { playlists, ready, deletePlaylist, addToPlaylist, setPlaylistImage } = useLibrary();
  const { playTracks } = usePlayer();
  const navigate = useNavigate();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addSongsOpen, setAddSongsOpen] = useState(false);
  const [songQuery, setSongQuery] = useState("");
  const [songResults, setSongResults] = useState<{ videoId: string; title: string; artist: string; thumbnail: string | null; duration?: string | null; album?: string | null }[]>([]);
  const [songSearchLoading, setSongSearchLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const playlist = playlists.find((p) => p.id === playlistId);

  const searchSongs = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!songQuery.trim()) return;
    setSongSearchLoading(true);
    try {
      const response = await fetch(`https://ghostmusic-s8vd.onrender.com/api/search?q=${encodeURIComponent(songQuery.trim())}&limit=12`);
      if (!response.ok) throw new Error("Search failed");
      const result = await response.json() as { results?: { videoId: string; title: string; artist: string; thumbnail: string | null; duration?: string | null; album?: string | null }[] };
      setSongResults(result.results ?? []);
    } catch {
      toast.error("Couldn't search for songs. Try again.");
    } finally {
      setSongSearchLoading(false);
    }
  };

  const toTrack = (song: { videoId: string; title: string; artist: string; thumbnail: string | null; duration?: string | null; album?: string | null }): Track => {
    const duration = song.duration?.split(":").reduce((total, part) => total * 60 + Number(part), 0) ?? 0;
    return { id: `yt-${song.videoId}`, title: song.title, artist: song.artist, albumId: song.videoId, albumTitle: song.album ?? "Unknown album", durationSec: Number.isFinite(duration) ? duration : 0, art: 0, genre: "unknown", playable: true, sourceId: "youtube-audio", sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(song.videoId)}` };
  };

  const chooseCover = (file?: File) => {
    if (!file || !playlist) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 1_800_000) {
      toast.error("That image is too large. Choose one under 1.8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPlaylistImage(playlist.id, reader.result);
        toast.success("Playlist cover updated");
      }
    };
    reader.onerror = () => toast.error("Couldn't read that image.");
    reader.readAsDataURL(file);
  };

  if (!ready) {
    return (
      <Page className="pt-10">
        <LoadingRows />
      </Page>
    );
  }

  if (!playlist) {
    return (
      <Page className="pt-10">
        <EmptyState
          icon={<ListMusic />}
          title="Playlist not found"
          action={
            <Button asChild variant="glow">
              <Link to="/playlists">Back to playlists</Link>
            </Button>
          }
        >
          It may have been deleted, or it was created in a different browser.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <CollectionHeader
        eyebrow="Playlist"
        title={playlist.name}
        art={<div className="group relative size-40 sm:size-48"><PlaylistCover playlist={playlist} className="size-full shadow-glow" /><button type="button" onClick={() => imageInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/65 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" aria-label="Change playlist cover"><ImagePlus size={24} />Change cover</button><input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { chooseCover(e.target.files?.[0]); e.currentTarget.value = ""; }} /></div>}
        meta={`${playlist.tracks.length} ${playlist.tracks.length === 1 ? "song" : "songs"}`}
        actions={
          <>
            {playlist.tracks.length > 0 && (
              <>
                <Button variant="glow" size="icon-xl" aria-label={`Play ${playlist.name} in order`} title="Play in order" onClick={() => playTracks(playlist.tracks)}>
                  <Play className="translate-x-px fill-current" />
                </Button>
                <Button variant="subtle" size="icon-xl" aria-label={`Shuffle ${playlist.name}`} title="Shuffle play" onClick={() => { const shuffled = [...playlist.tracks]; for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; } playTracks(shuffled); }}>
                  <Shuffle />
                </Button>
              </>
            )}
            <Button variant="subtle" size="icon-lg" aria-label="Add songs" title="Add songs" onClick={() => setAddSongsOpen((v) => !v)}>
              <Plus />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="subtle" size="icon-lg" aria-label="Playlist options">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                  <Pencil /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 /> Delete playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {addSongsOpen && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-bold">Add songs</h2><p className="text-sm text-muted-foreground">Search music and add it straight to this playlist.</p></div>
            <Button variant="subtle" size="icon" aria-label="Close add songs" onClick={() => setAddSongsOpen(false)}><X /></Button>
          </div>
          <form onSubmit={searchSongs} className="flex gap-2">
            <Input value={songQuery} onChange={(e) => setSongQuery(e.target.value)} placeholder="Search songs or artists…" aria-label="Search songs to add" />
            <Button type="submit" variant="glow" disabled={songSearchLoading || !songQuery.trim()}><Search className="size-4" />{songSearchLoading ? "Searching…" : "Search"}</Button>
          </form>
          {songResults.length > 0 && <div className="mt-4 divide-y divide-border/70">
            {songResults.map((song) => {
              const alreadyAdded = playlist.tracks.some((t) => t.id === `yt-${song.videoId}`);
              return <div key={song.videoId} className="flex items-center gap-3 py-2">
                {song.thumbnail ? <img src={song.thumbnail} alt="" className="size-11 rounded-md object-cover" /> : <div className="size-11 rounded-md bg-muted" />}
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{song.title}</p><p className="truncate text-xs text-muted-foreground">{song.artist}</p></div>
                <Button size="sm" variant={alreadyAdded ? "subtle" : "outline"} disabled={alreadyAdded} onClick={() => addToPlaylist(playlist.id, toTrack(song))}>{alreadyAdded ? "Added" : <><Plus className="size-4" /> Add</>}</Button>
              </div>;
            })}
          </div>}
        </section>
      )}

      {playlist.tracks.length === 0 ? (
        <EmptyState
          icon={<ListMusic />}
          title="This playlist is empty"
          action={
            <Button asChild variant="glow">
              <Link to="/explore">Browse songs</Link>
            </Button>
          }
        >
          Use “Add to playlist” in any track's “⋯” menu.
        </EmptyState>
      ) : (
        <TrackList tracks={playlist.tracks} playlistId={playlist.id} label={`${playlist.name} tracks`} />
      )}

      <CreatePlaylistDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        rename={{ id: playlist.id, name: playlist.name }}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-border bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{playlist.name}”?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const name = playlist.name;
                navigate({ to: "/playlists" });
                deletePlaylist(playlist.id);
                toast("Playlist deleted", { description: name });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
