import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Track } from "@/lib/music/types";
import { cn } from "@/lib/utils";

import { useLibrary } from "./library-context";

export function LikeButton({ track, className }: { track: Track; className?: string }) {
  const { isLiked, toggleLike } = useLibrary();
  const liked = isLiked(track.id);
  return (
    <Button
      variant="subtle"
      size="icon-sm"
      aria-pressed={liked}
      aria-label={liked ? `Remove ${track.title} from Liked Songs` : `Like ${track.title}`}
      data-active={liked}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        toggleLike(track);
      }}
    >
      <Heart className={cn(liked && "fill-current")} />
    </Button>
  );
}
