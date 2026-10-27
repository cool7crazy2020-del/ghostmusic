import { useNavigate } from "@tanstack/react-router";
import { Disc3, ListEnd, ListPlus, ListStart, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Track } from "@/lib/music/types";

import { CreatePlaylistDialog } from "./CreatePlaylistDialog";
import { useLibrary } from "./library-context";
import { usePlayer } from "./player-context";

export function TrackActionsMenu({ track, playlistId }: { track: Track; playlistId?: string }) {
  const { playlists, addToPlaylist, removeFromPlaylist } = useLibrary();
  const { addToQueue, playNext } = usePlayer();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="subtle"
            size="icon-sm"
            aria-label={`More options for ${track.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => playNext(track)}>
            <ListStart /> Play next
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => addToQueue(track)}>
            <ListEnd /> Add to queue
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ListPlus className="mr-2 size-4" /> Add to playlist
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
                <Plus /> New playlist…
              </DropdownMenuItem>
              {playlists.length > 0 && <DropdownMenuSeparator />}
              {playlists.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => addToPlaylist(p.id, track)}>
                  <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => navigate({ to: "/album/$albumId", params: { albumId: track.albumId } })}
          >
            <Disc3 /> Go to album
          </DropdownMenuItem>
          {playlistId && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                removeFromPlaylist(playlistId, track.id);
                toast("Removed from playlist", { description: track.title });
              }}
            >
              <Trash2 /> Remove from this playlist
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreatePlaylistDialog open={dialogOpen} onOpenChange={setDialogOpen} track={track} />
    </>
  );
}
