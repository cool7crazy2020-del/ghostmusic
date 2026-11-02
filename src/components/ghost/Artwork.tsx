import { Ghost } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface ArtworkProps {
  art: number;
  /** Remote cover image (e.g. a YouTube thumbnail). Falls back to the gradient placeholder. */
  image?: string | undefined;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/** Cover image, or a gradient placeholder when there is none. */
export function Artwork({ art, image, label, className, size = "md" }: ArtworkProps) {
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    return (
      <img
        src={image}
        alt={label ?? ""}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-md bg-surface-raised object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        `art-${((art % 8) + 8) % 8}`,
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md",
        className,
      )}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Ghost
        className={cn(
          "text-foreground/25",
          size === "sm" && "size-4",
          size === "md" && "size-8",
          size === "lg" && "size-16",
        )}
        strokeWidth={1.5}
      />
    </div>
  );
}
