import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ListMusic, MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const { playlists, ready, deletePlaylist } = useLibrary();
  const { playTracks } = usePlayer();
  const navigate = useNavigate();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const playlist = playlists.find((p) => p.id === playlistId);

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
        art={<PlaylistCover playlist={playlist} className="size-40 shadow-glow sm:size-48" />}
        meta={`${playlist.tracks.length} ${playlist.tracks.length === 1 ? "song" : "songs"}`}
        actions={
          <>
            {playlist.tracks.length > 0 && (
              <Button
                variant="glow"
                size="icon-xl"
                aria-label={`Play ${playlist.name}`}
                onClick={() => playTracks(playlist.tracks)}
              >
                <Play className="translate-x-px fill-current" />
              </Button>
            )}
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
