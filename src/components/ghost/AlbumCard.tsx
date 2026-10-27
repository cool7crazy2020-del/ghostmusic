import { Link } from "@tanstack/react-router";

import type { Album } from "@/lib/music/types";

import { Artwork } from "./Artwork";

export function AlbumCard({ album }: { album: Album }) {
  return (
    <Link
      to="/album/$albumId"
      params={{ albumId: album.id }}
      className="group flex flex-col gap-3 rounded-xl bg-surface p-3 transition-all hover:bg-surface-raised hover:shadow-glow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Artwork art={album.art} size="lg" className="aspect-square w-full rounded-lg shadow-lg transition-transform duration-300 group-hover:scale-[1.02]" />
      <div className="min-w-0">
        <div className="truncate font-semibold text-foreground">{album.title}</div>
        <div className="truncate text-sm text-muted-foreground">
          {album.year} · {album.artist}
        </div>
      </div>
    </Link>
  );
}
