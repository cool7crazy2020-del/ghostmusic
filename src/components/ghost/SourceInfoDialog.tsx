import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { activeSource } from "@/lib/music/source";

import { useLibrary } from "./library-context";

export function SourceInfoDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { storageAvailable } = useLibrary();
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="subtle" size="sm">
            <Info /> How playback works
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">How playback works</DialogTitle>
          <DialogDescription>
            Current source: <span className="font-semibold text-foreground">{activeSource.name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 text-sm text-muted-foreground">
          <p>
            GHOST Music is running on a <strong className="text-foreground">sample catalog</strong>. All
            artists, albums and songs are fictional. Search only looks through this sample list.
          </p>
          <p>
            Songs marked <span className="font-semibold text-primary">Demo</span> have short original audio
            loops made for this app. Songs marked <span className="font-semibold text-foreground">No audio</span>{" "}
            have no sound, and the player will say so instead of pretending to play.
          </p>
          <p>
            Full-catalog search and playback need a supported, licensed music provider (or your own audio
            library). GHOST never scrapes other sites or bypasses copy protection.
          </p>
          <p>
            Likes, playlists and history are saved in this browser only
            {storageAvailable
              ? "."
              : ". Right now your browser is blocking storage for this embedded page, so changes will be lost when you leave."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
