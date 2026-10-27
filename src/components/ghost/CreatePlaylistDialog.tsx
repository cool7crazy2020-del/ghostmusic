import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultPlaylistName } from "@/lib/library-store";
import type { Track } from "@/lib/music/types";

import { useLibrary } from "./library-context";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional track to add to the new playlist. */
  track?: Track;
  /** Rename mode: pass an existing playlist. */
  rename?: { id: string; name: string };
}

export function CreatePlaylistDialog({ open, onOpenChange, track, rename }: Props) {
  const { playlists, createPlaylist, renamePlaylist } = useLibrary();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(rename?.name ?? "");
  }, [open, rename?.name]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rename) {
      if (!name.trim()) return;
      renamePlaylist(rename.id, name);
      toast("Playlist renamed", { description: name.trim() });
      onOpenChange(false);
      return;
    }
    const id = createPlaylist(name, track);
    toast("Playlist created", { description: name.trim() || defaultPlaylistName(playlists) });
    onOpenChange(false);
    if (!track) navigate({ to: "/playlists/$playlistId", params: { playlistId: id } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="font-display">{rename ? "Rename playlist" : "New playlist"}</DialogTitle>
            <DialogDescription>
              {rename
                ? "Give this playlist a new name."
                : track
                  ? `“${track.title}” will be added to it.`
                  : "Playlists are saved in this browser."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="playlist-name">Name</Label>
            <Input
              id="playlist-name"
              autoFocus
              maxLength={60}
              value={name}
              placeholder={rename ? undefined : defaultPlaylistName(playlists)}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="glow" disabled={!!rename && !name.trim()}>
              {rename ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
