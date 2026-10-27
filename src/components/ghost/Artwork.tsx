import { Ghost } from "lucide-react";

import { cn } from "@/lib/utils";

interface ArtworkProps {
  art: number;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/** Gradient artwork placeholder. Real providers can swap this for cover image URLs. */
export function Artwork({ art, label, className, size = "md" }: ArtworkProps) {
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
