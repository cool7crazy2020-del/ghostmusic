import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { History as HistoryIcon, Trash2 } from "lucide-react";

import { useLibrary } from "@/components/ghost/library-context";
import { EmptyState, LoadingRows, Page } from "@/components/ghost/page-parts";
import { TrackList } from "@/components/ghost/TrackList";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — GHOST Music" },
      { name: "description", content: "Recently played songs in GHOST Music, saved in this browser." },
      { property: "og:title", content: "History — GHOST Music" },
      { property: "og:description", content: "Recently played songs in GHOST Music, saved in this browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { history, ready, clearHistory } = useLibrary();
  const tracks = history.map((h) => h.track);

  return (
    <Page>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">History</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Songs that actually played, newest first. Unavailable demo tracks aren't recorded.
          </p>
        </div>
        {history.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="pill" size="sm">
                <Trash2 /> Clear history
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border bg-popover">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear listening history?</AlertDialogTitle>
                <AlertDialogDescription>This removes all {history.length} entries from this browser.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={clearHistory}>
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="mt-8">
        {!ready ? (
          <LoadingRows />
        ) : history.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon />}
            title="Nothing played yet"
            action={
              <Button asChild variant="glow">
                <Link to="/">Start listening</Link>
              </Button>
            }
          >
            Play a song marked Demo and it will show up here.
          </EmptyState>
        ) : (
          <TrackList
            tracks={tracks}
            label="Recently played"
            meta={(_, i) => formatDistanceToNow(history[i].playedAt, { addSuffix: true })}
          />
        )}
      </div>
    </Page>
  );
}
